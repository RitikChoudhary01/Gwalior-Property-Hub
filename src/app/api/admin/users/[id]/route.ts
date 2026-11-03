// ============================================================
// Admin — user account actions (ADMIN only)
// verify / unverify / activate / deactivate, with builder
// profile verification kept in sync. Self-lockout is blocked.
// ============================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["verify", "unverify", "activate", "deactivate"]),
});

const userInclude = {
  builderProfile: true,
  _count: { select: { properties: true, leads: true } },
} satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function toAdminUserDTO(u: UserRow, projectCount: number) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isVerified: u.isVerified,
    isActive: u.isActive,
    city: u.city,
    createdAt: u.createdAt.toISOString(),
    builderProfile: u.builderProfile
      ? {
          id: u.builderProfile.id,
          companyName: u.builderProfile.companyName,
          isVerified: u.builderProfile.isVerified,
        }
      : null,
    _count: {
      properties: u._count.properties,
      projects: projectCount,
      leads: u._count.leads,
    },
  };
}

const NOTIFICATIONS = {
  verify: { title: "Account verified", message: "Your account was verified by Vasati." },
  unverify: { title: "Verification revoked", message: "Your account verification was revoked by Vasati." },
  activate: { title: "Account activated", message: "Your account was activated by Vasati." },
  deactivate: { title: "Account deactivated", message: "Your account was deactivated by Vasati. Contact support if you believe this is a mistake." },
} as const;

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    const body = await parseBody(req, actionSchema);

    const user = await db.user.findUnique({ where: { id }, include: { builderProfile: true } });
    if (!user) return fail("User not found.", 404);

    if (user.id === admin.id && (body.action === "deactivate" || body.action === "unverify")) {
      return fail(`You cannot ${body.action} your own account.`, 400);
    }

    let updated: UserRow;
    if (body.action === "verify" || body.action === "unverify") {
      const value = body.action === "verify";
      updated = await db.user.update({
        where: { id: user.id },
        data: {
          isVerified: value,
          // keep builder company verification in sync with the account
          ...(user.role === "BUILDER" && user.builderProfile
            ? { builderProfile: { update: { isVerified: value } } }
            : {}),
        },
        include: userInclude,
      });
    } else {
      updated = await db.user.update({
        where: { id: user.id },
        data: { isActive: body.action === "activate" },
        include: userInclude,
      });
    }

    const projectCount = updated.builderProfile
      ? await db.project.count({ where: { builderId: updated.builderProfile.id } })
      : 0;

    const auditAction =
      body.action === "verify"
        ? "USER_VERIFIED"
        : body.action === "unverify"
          ? "USER_UNVERIFIED"
          : body.action === "activate"
            ? "USER_ACTIVATED"
            : "USER_DEACTIVATED";
    const detail =
      body.action === "verify"
        ? "account verified"
        : body.action === "unverify"
          ? "verification revoked"
          : body.action === "activate"
            ? "account activated"
            : "account deactivated";
    await audit(admin.id, auditAction, "USER", user.id, `${user.name} (${user.email}) — ${detail}`);

    await notify({
      userId: user.id,
      title: NOTIFICATIONS[body.action].title,
      message: NOTIFICATIONS[body.action].message,
      type: "SYSTEM",
      link: "#/dashboard",
    });

    return ok({ user: toAdminUserDTO(updated, projectCount) });
  });
}
