import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { toAuthUser } from "@/lib/serializers";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`login:${ip}`, 30, 900000)) {
      return fail("Too many sign-in attempts. Please try again in a few minutes.", 429);
    }

    const body = await parseBody(req, schema);
    const user = await db.user.findUnique({ where: { email: body.email }, include: { builderProfile: true } });

    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return fail("Invalid email or password.", 401);
    }
    if (!user.isActive) {
      return fail("This account has been deactivated. Please contact support.", 403);
    }

    const token = await createSession(user.id);
    const res = NextResponse.json(toAuthUser(user));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}

export const dynamic = "force-dynamic";
