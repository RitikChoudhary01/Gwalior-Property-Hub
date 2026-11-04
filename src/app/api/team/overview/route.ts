// ============================================================
// Team dashboard overview (TEAM role only) — the single payload
// behind the team overview, tasks and activity tabs: assigned
// lead KPIs, pipeline snapshot, upcoming follow-ups, a derived
// worklist (tasks) and the member's own activity history.
// Team members only ever see leads assigned to them.
// ============================================================

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";
import { leadInclude, toLeadDTO } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT_SCHEDULED", "SITE_VISIT_COMPLETED", "NEGOTIATION", "BOOKING"];

export async function GET() {
  return handle(async () => {
    const user = await requireUser(["TEAM"]);

    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const inSevenDays = new Date(now.getTime() + 7 * 86400000);

    const assignedWhere = { assignedToId: user.id };

    const [assigned, open, dueFollowUps, upcomingVisits, statusGroups, followUpLeads, taskLeads, taskVisits, activities] =
      await Promise.all([
        db.lead.count({ where: assignedWhere }),
        db.lead.count({ where: { ...assignedWhere, status: { in: OPEN_STATUSES } } }),
        db.lead.count({
          where: { ...assignedWhere, followUpDate: { lte: endOfToday }, status: { in: OPEN_STATUSES } },
        }),
        db.siteVisit.count({
          where: {
            lead: assignedWhere,
            status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
            preferredDate: { gte: now },
          },
        }),
        db.lead.groupBy({ by: ["status"], _count: true, where: assignedWhere }),
        // upcoming follow-ups (next 5)
        db.lead.findMany({
          where: { ...assignedWhere, followUpDate: { not: null }, status: { in: OPEN_STATUSES } },
          include: leadInclude,
          orderBy: { followUpDate: "asc" },
          take: 5,
        }),
        // worklist inputs
        db.lead.findMany({
          where: {
            ...assignedWhere,
            status: { in: OPEN_STATUSES },
            OR: [
              { followUpDate: { lte: endOfToday } }, // follow-up due/overdue
              { status: "NEW", lastContactedAt: null }, // never contacted
            ],
          },
          include: leadInclude,
          orderBy: [{ followUpDate: "asc" }, { createdAt: "asc" }],
          take: 12,
        }),
        db.siteVisit.findMany({
          where: {
            lead: assignedWhere,
            status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
            preferredDate: { lte: inSevenDays },
          },
          include: { lead: { select: { id: true, name: true } }, property: { select: { title: true } } },
          orderBy: { preferredDate: "asc" },
          take: 12,
        }),
        db.leadActivity.findMany({
          where: { userId: user.id, lead: { assignedToId: user.id } },
          orderBy: { createdAt: "desc" },
          take: 15,
          include: {
            lead: {
              select: { id: true, reference: true, name: true, property: { select: { title: true } } },
            },
            user: { select: { id: true, name: true } },
          },
        }),
      ]);

    // ---- derived tasks ----
    const tasks: {
      id: string;
      kind: "FOLLOW_UP_DUE" | "FOLLOW_UP_TODAY" | "NEW_UNCONTACTED" | "VISIT_TO_CONFIRM" | "VISIT_UPCOMING";
      title: string;
      detail: string;
      due: string | null;
      leadId: string | null;
      visitId: string | null;
      propertyTitle: string;
    }[] = [];

    for (const l of taskLeads) {
      if (l.followUpDate && l.followUpDate <= endOfToday) {
        const today = l.followUpDate.toDateString() === now.toDateString();
        tasks.push({
          id: `fu-${l.id}`,
          kind: today ? "FOLLOW_UP_TODAY" : "FOLLOW_UP_DUE",
          title: today ? `Call ${l.name} — follow-up due today` : `Follow up with ${l.name} — overdue`,
          detail: `${l.reference} · ${l.property.title}`,
          due: l.followUpDate.toISOString(),
          leadId: l.id,
          visitId: null,
          propertyTitle: l.property.title,
        });
      } else if (l.status === "NEW" && !l.lastContactedAt) {
        tasks.push({
          id: `new-${l.id}`,
          kind: "NEW_UNCONTACTED",
          title: `New lead ${l.name} waiting for first contact`,
          detail: `${l.reference} · ${l.property.title}`,
          due: null,
          leadId: l.id,
          visitId: null,
          propertyTitle: l.property.title,
        });
      }
    }

    for (const v of taskVisits) {
      if (v.status === "REQUESTED") {
        tasks.push({
          id: `vtc-${v.id}`,
          kind: "VISIT_TO_CONFIRM",
          title: `Confirm site visit for ${v.contactName}`,
          detail: `${v.property.title} · ${v.preferredDate.toDateString()} at ${v.preferredTime}`,
          due: v.preferredDate.toISOString(),
          leadId: v.leadId,
          visitId: v.id,
          propertyTitle: v.property.title,
        });
      } else {
        tasks.push({
          id: `vu-${v.id}`,
          kind: "VISIT_UPCOMING",
          title: `Site visit with ${v.contactName} this week`,
          detail: `${v.property.title} · ${v.preferredDate.toDateString()} at ${v.preferredTime}`,
          due: v.preferredDate.toISOString(),
          leadId: v.leadId,
          visitId: v.id,
          propertyTitle: v.property.title,
        });
      }
    }

    // most urgent first: overdue follow-ups, then today, then visits, then new
    const kindOrder = ["FOLLOW_UP_DUE", "FOLLOW_UP_TODAY", "VISIT_TO_CONFIRM", "VISIT_UPCOMING", "NEW_UNCONTACTED"];
    tasks.sort((a, b) => {
      const k = kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind);
      if (k !== 0) return k;
      return (a.due ? Date.parse(a.due) : Infinity) - (b.due ? Date.parse(b.due) : Infinity);
    });

    return ok({
      stats: { assigned, open, dueFollowUps, upcomingVisits },
      pipeline: statusGroups.map((g) => ({ status: g.status, count: g._count })),
      followUps: followUpLeads.map(toLeadDTO),
      tasks: tasks.slice(0, 15),
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
        user: a.user ? { id: a.user.id, name: a.user.name } : null,
        lead: a.lead
          ? {
              id: a.lead.id,
              reference: a.lead.reference,
              name: a.lead.name,
              propertyTitle: a.lead.property.title,
            }
          : null,
      })),
    });
  });
}
