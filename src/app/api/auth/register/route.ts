import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";
import { toAuthUser } from "@/lib/serializers";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  role: z.enum(["BUYER", "SELLER", "BUILDER"]),
  companyName: z.string().trim().min(2).max(100).optional(),
  city: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`register:${ip}`, 12, 3600000)) {
      return fail("Too many registration attempts. Please try again later.", 429);
    }

    const body = await parseBody(req, schema);
    if (body.role === "BUILDER" && !body.companyName) {
      return fail("Company name is required for builder accounts.", 422);
    }

    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return fail("An account with this email already exists. Try signing in instead.", 409);
    }

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: hashPassword(body.password),
        phone: body.phone || null,
        role: body.role,
        city: body.city || null,
        ...(body.role === "BUILDER" && body.companyName
          ? {
              builderProfile: {
                create: { companyName: body.companyName, city: body.city || null },
              },
            }
          : {}),
      },
      include: { builderProfile: true },
    });

    const token = await createSession(user.id);
    await audit(user.id, "USER_REGISTERED", "USER", user.id, `Role: ${user.role}`);

    if (body.role === "SELLER" || body.role === "BUILDER") {
      const label = body.role === "BUILDER" ? body.companyName : body.name;
      await notifyAdmins({
        title: `${body.role === "BUILDER" ? "Builder" : "Seller"} registration`,
        message: `${label} (${body.email}) registered and requires verification.`,
        type: "SYSTEM",
        link: "#/dashboard?tab=users",
      });
    }

    const res = NextResponse.json(toAuthUser(user), { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}

export const dynamic = "force-dynamic";
