// ============================================================
// Admin — manage an individual team member (ADMIN only):
// activate / deactivate / resend invite / revoke pending invite.
// ============================================================

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { newInviteToken } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["activate", "deactivate", "resend"]),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    const body = await parseBody(req, actionSchema);

    const member = await db.user.findUnique({ where: { id }, include: { _count: { select: { assignedLeads: true } } } });
    if (!member || member.role !== "TEAM") return fail("Team member not found.", 404);

    if (body.action === "resend") {
      if (!member.inviteToken) {
        return fail("This member has already activated their account.", 400);
      }
      const token = newInviteToken();
      await db.user.update({ where: { id: member.id }, data: { inviteToken: token, isActive: false } });
      await audit(admin.id, "TEAM_INVITE_RESENT", "USER", member.id, `${member.name} (${member.email})`);
      return ok({ member: { id: member.id, name: member.name, email: member.email, inviteToken: token } });
    }

    if (body.action === "activate" && member.inviteToken) {
      return fail("This member must first activate their account via the invitation link.", 400);
    }

    const value = body.action === "activate";
    await db.user.update({ where: { id: member.id }, data: { isActive: value } });
    await audit(
      admin.id,
      value ? "TEAM_MEMBER_ACTIVATED" : "TEAM_MEMBER_DEACTIVATED",
      "USER",
      member.id,
      `${member.name} (${member.email})`
    );
    if (!member.inviteToken) {
      await notify({
        userId: member.id,
        title: value ? "Account activated" : "Account deactivated",
        message: value
          ? "Your Gwalior Property Hub team account was re-activated by an administrator."
          : "Your Gwalior Property Hub team account was deactivated. Contact an administrator if you believe this is a mistake.",
        type: "SYSTEM",
        link: "#/dashboard",
      });
    }

    return ok({ ok: true });
  });
}

// ---------------- DELETE: revoke a pending invitation ----------------

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;

    const member = await db.user.findUnique({ where: { id }, include: { _count: { select: { assignedLeads: true } } } });
    if (!member || member.role !== "TEAM") return fail("Team member not found.", 404);

    if (member._count.assignedLeads > 0) {
      return fail("This member still has assigned leads. Reassign them before removing the account.", 409);
    }

    await db.user.delete({ where: { id: member.id } });
    await audit(admin.id, "TEAM_MEMBER_REMOVED", "USER", member.id, `${member.name} (${member.email})`);

    return ok({ ok: true });
  });
}
