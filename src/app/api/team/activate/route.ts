// ============================================================
// Team activation — an invited internal team member sets their
// password (and confirms name/phone) through this endpoint and
// is signed straight into the Team Dashboard. The invitation
// token is single-use; the account stays inactive until used.
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { ok, fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { toAuthUser } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// ---------------- GET: preview an invitation ----------------

export async function GET(req: Request) {
  return handle(async () => {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return fail("Invitation token missing.", 400);

    const member = await db.user.findUnique({ where: { inviteToken: token } });
    if (!member || member.role !== "TEAM") {
      return fail("This invitation link is invalid or has already been used.", 404);
    }

    return ok({ name: member.name, email: member.email, city: member.city });
  });
}

// ---------------- POST: activate the account ----------------

const activateSchema = z.object({
  token: z.string().min(10, "Invitation token missing"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`team-activate:${ip}`, 20, 3600000)) {
      return fail("Too many attempts. Please try again later.", 429);
    }

    const body = await parseBody(req, activateSchema);
    const member = await db.user.findUnique({ where: { inviteToken: body.token } });
    if (!member || member.role !== "TEAM") {
      return fail("This invitation link is invalid or has already been used.", 404);
    }

    const updated = await db.user.update({
      where: { id: member.id },
      data: {
        name: body.name,
        phone: body.phone || member.phone,
        passwordHash: hashPassword(body.password),
        isActive: true,
        inviteToken: null,
      },
      include: { builderProfile: true },
    });

    await audit(member.id, "TEAM_MEMBER_ACTIVATED", "USER", member.id, `${member.name} (${member.email})`);

    const token = await createSession(member.id);
    const res = NextResponse.json(toAuthUser(updated));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}
