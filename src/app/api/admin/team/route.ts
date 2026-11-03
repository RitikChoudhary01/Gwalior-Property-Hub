// ============================================================
// Admin — internal team management (ADMIN only).
// Team members are invite-only: an admin invites by email, the
// member activates via #/team-activate?token=… and then signs in
// to the Team Dashboard. Public registration never creates TEAM
// accounts (the register API only accepts BUYER/SELLER/BUILDER).
// ============================================================

import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/notifications";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export function newInviteToken(): string {
  return randomBytes(24).toString("hex");
}

const teamInclude = {
  _count: { select: { assignedLeads: true } },
} as const;

type TeamRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  isActive: boolean;
  inviteToken: string | null;
  createdAt: Date;
  _count: { assignedLeads: number };
};

function toMemberDTO(u: TeamRow, openLeads: number, convertedLeads: number) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    city: u.city,
    isActive: u.isActive,
    invitePending: u.inviteToken !== null,
    inviteToken: u.inviteToken,
    createdAt: u.createdAt.toISOString(),
    _count: { assignedLeads: u._count.assignedLeads, openLeads, convertedLeads },
  };
}

async function leadCounts(userId: string) {
  const [assigned, open, converted] = await Promise.all([
    db.lead.count({ where: { assignedToId: userId } }),
    db.lead.count({ where: { assignedToId: userId, status: { notIn: ["CONVERTED", "LOST"] } } }),
    db.lead.count({ where: { assignedToId: userId, status: "CONVERTED" } }),
  ]);
  return { assigned, open, converted };
}

// ---------------- GET: list team members ----------------

export async function GET() {
  return handle(async () => {
    await requireUser(["ADMIN"]);

    const members = await db.user.findMany({
      where: { role: "TEAM" },
      include: teamInclude,
      orderBy: { createdAt: "desc" },
    });

    const counts = await Promise.all(members.map((m) => leadCounts(m.id)));

    return ok({
      data: members.map((m, i) => toMemberDTO(m, counts[i].open, counts[i].converted)),
    });
  });
}

// ---------------- POST: invite a team member ----------------

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const body = await parseBody(req, inviteSchema);

    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return fail("An account with this email already exists on the platform.", 409);
    }

    const token = newInviteToken();
    // The account stays inactive with an unusable password until the
    // invitee activates it through the invitation link.
    const member = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        city: body.city || null,
        role: "TEAM",
        passwordHash: hashPassword(randomBytes(24).toString("hex")),
        isActive: false,
        isVerified: true, // internal staff — trusted once activated
        inviteToken: token,
      },
    });

    await audit(admin.id, "TEAM_MEMBER_INVITED", "USER", member.id, `${member.name} (${member.email})`);

    // Email channel is skipped gracefully when no provider is configured —
    // the admin UI surfaces a copyable invitation link either way.
    void sendEmail(
      member.email,
      `You're invited to join ${BRAND.name}`,
      `Hello ${member.name},\n\nYou've been invited to the ${BRAND.name} team.\nActivate your account: #/team-activate?token=${token}`
    );

    return ok(
      {
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          inviteToken: token,
        },
      },
      201
    );
  });
}
