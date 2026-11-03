// ============================================================
// Admin — platform statistics (ADMIN only)
// KPI counters, lead funnel, 6-month lead trend and
// commission ledger totals (earned / received / outstanding).
// ============================================================

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const QUALIFIED_LEAD_STATUSES = [
  "QUALIFIED",
  "SITE_VISIT_SCHEDULED",
  "SITE_VISIT_COMPLETED",
  "NEGOTIATION",
  "BOOKING",
  "CONVERTED",
];

export async function GET() {
  return handle(async () => {
    await requireUser(["ADMIN"]);

    // last 6 calendar months (current month - 5 ... current), chronological order
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en-US", { month: "short" }),
      });
    }
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalUsers,
      buyers,
      sellers,
      builders,
      activeProperties,
      pendingProperties,
      pendingProjects,
      totalLeads,
      qualifiedLeads,
      siteVisits,
      confirmedTransactions,
      commissionAgg,
      leadStatusGroups,
      recentLeadDates,
      cityGroups,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "BUYER" } }),
      db.user.count({ where: { role: "SELLER" } }),
      db.user.count({ where: { role: "BUILDER" } }),
      db.property.count({ where: { status: "PUBLISHED" } }),
      db.property.count({ where: { status: "PENDING" } }),
      db.project.count({ where: { status: "PENDING" } }),
      db.lead.count(),
      db.lead.count({ where: { status: { in: QUALIFIED_LEAD_STATUSES } } }),
      db.siteVisit.count(),
      db.transaction.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
      db.commission.aggregate({ _sum: { amount: true, paidAmount: true } }),
      db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      db.lead.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      db.property.groupBy({
        by: ["city"],
        where: { status: "PUBLISHED" },
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 8,
      }),
    ]);

    const monthCounts = new Map<string, number>();
    for (const lead of recentLeadDates) {
      const key = `${lead.createdAt.getFullYear()}-${lead.createdAt.getMonth()}`;
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }

    const commissionEarned = commissionAgg._sum.amount ?? 0;
    const commissionReceived = commissionAgg._sum.paidAmount ?? 0;

    return ok({
      totalUsers,
      buyers,
      sellers,
      builders,
      activeProperties,
      pendingApprovals: pendingProperties + pendingProjects,
      totalLeads,
      qualifiedLeads,
      siteVisits,
      confirmedTransactions,
      commissionEarned,
      commissionReceived,
      outstandingCommission: commissionEarned - commissionReceived,
      leadsByStatus: leadStatusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      leadsByMonth: months.map((m) => ({ month: m.label, count: monthCounts.get(m.key) ?? 0 })),
      propertiesByCity: cityGroups.map((g) => ({ city: g.city, count: g._count._all })),
    });
  });
}
