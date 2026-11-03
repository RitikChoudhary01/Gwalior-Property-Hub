import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { leadInclude, toLeadDTO, visitInclude, toVisitDTO } from "@/lib/serializers";
import { LEAD_STATUSES } from "@/lib/constants";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const LEAD_STATUS_VALUES = LEAD_STATUSES.map((s) => s.value) as [string, ...string[]];
const OWNER_ALLOWED_STATUSES = ["CONTACTED", "LOST"] as const;

async function getLeadWithContext(id: string) {
  return db.lead.findUnique({
    where: { id },
    include: {
      ...leadInclude,
      property: {
        select: {
          id: true, slug: true, title: true, city: true, locality: true, price: true,
          sellerId: true, builderId: true,
          images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, isMain: true } },
          seller: { select: { name: true, role: true } },
          builder: { select: { companyName: true } },
        },
      },
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return fail("Sign in required.", 401);

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        ...leadInclude,
        property: {
          select: {
            id: true, slug: true, title: true, city: true, locality: true, price: true,
            sellerId: true, builderId: true,
            images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, isMain: true } },
            seller: { select: { name: true, role: true } },
            builder: { select: { companyName: true } },
          },
        },
      },
    });
    if (!lead) return fail("Lead not found.", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = lead.property.sellerId === user.id || (user.builderProfile && lead.property.builderId === user.builderProfile.id);
    const isBuyer = lead.buyerId === user.id;
    if (!isAdmin && !isOwner && !isBuyer) return fail("Not allowed.", 403);

    const [activities, visits] = await Promise.all([
      db.leadActivity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      }),
      db.siteVisit.findMany({ where: { leadId: lead.id }, include: visitInclude, orderBy: { preferredDate: "desc" } }),
    ]);

    return ok({
      lead: toLeadDTO(lead),
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
        user: a.user,
      })),
      visits: visits.map(toVisitDTO),
    });
  });
}

const patchSchema = z.object({
  status: z.string().refine((s) => LEAD_STATUS_VALUES.includes(s), "Invalid status").optional(),
  assignedToId: z.string().nullable().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  note: z.string().trim().min(1, "Note cannot be empty").max(600).optional(),
  markContacted: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return fail("Sign in required.", 401);

    const lead = await db.lead.findUnique({
      where: { id },
      include: { property: { select: { sellerId: true, builderId: true, title: true } } },
    });
    if (!lead) return fail("Lead not found.", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = lead.property.sellerId === user.id || (user.builderProfile && lead.property.builderId === user.builderProfile.id);
    if (!isAdmin && !isOwner) return fail("Not allowed.", 403);

    const body = await parseBody(req, patchSchema);
    const data: Record<string, unknown> = {};
    const activityCreates: { type: string; note: string; userId: string | null }[] = [];

    if (body.status) {
      if (!isAdmin && !(OWNER_ALLOWED_STATUSES as readonly string[]).includes(body.status)) {
        return fail("Listing owners can only mark leads as Contacted or Lost.", 403);
      }
      if (body.status !== lead.status) {
        data.status = body.status;
        activityCreates.push({
          type: "STATUS_CHANGE",
          note: `Status changed from ${lead.status.replace(/_/g, " ")} to ${body.status.replace(/_/g, " ")}.`,
          userId: user.id,
        });
      }
    }

    if (body.assignedToId !== undefined) {
      if (!isAdmin) return fail("Only administrators can assign leads.", 403);
      data.assignedToId = body.assignedToId;
      const assignee = body.assignedToId
        ? await db.user.findUnique({ where: { id: body.assignedToId }, select: { name: true } })
        : null;
      activityCreates.push({
        type: "ASSIGNMENT",
        note: body.assignedToId ? `Lead assigned to ${assignee?.name ?? "team member"}.` : "Lead unassigned.",
        userId: user.id,
      });
    }

    if (body.followUpDate !== undefined) {
      if (!isAdmin) return fail("Only administrators can set follow-ups.", 403);
      data.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
    }

    if (body.markContacted) {
      data.lastContactedAt = new Date();
    }

    if (body.note) {
      activityCreates.push({ type: "NOTE", note: body.note, userId: user.id });
    }

    const updated = await db.$transaction(async (tx) => {
      const l = await tx.lead.update({
        where: { id: lead.id },
        data,
        include: leadInclude,
      });
      if (activityCreates.length) {
        await tx.leadActivity.createMany({
          data: activityCreates.map((a) => ({ ...a, leadId: lead.id })),
        });
      }
      return l;
    });

    if (body.status && body.status !== lead.status) {
      await audit(user.id, "LEAD_STATUS_UPDATED", "LEAD", lead.id, `${lead.status} → ${body.status}`);
      // notify listing owner about qualified progress
      if (["SITE_VISIT_SCHEDULED", "NEGOTIATION", "BOOKING", "CONVERTED"].includes(body.status)) {
        await notify({
          userId: lead.property.sellerId,
          title: "Lead update",
          message: `Lead ${lead.reference} (${lead.name}) moved to ${body.status.replace(/_/g, " ").toLowerCase()} for "${lead.property.title}".`,
          type: "ENQUIRY",
          link: "#/dashboard?tab=enquiries",
        });
      }
    }

    return ok({ lead: toLeadDTO(updated) });
  });
}
