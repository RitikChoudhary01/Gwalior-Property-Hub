import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";
import { propertyListInclude, toCard } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// Role-aware dashboard stats — real counts from the database.
export async function GET() {
  return handle(async () => {
    const user = await requireUser();

    if (user.role === "BUYER") {
      const [favourites, enquiries, upcomingVisits, recentProps] = await Promise.all([
        db.favourite.count({ where: { userId: user.id } }),
        db.lead.count({ where: { buyerId: user.id } }),
        db.siteVisit.count({
          where: {
            buyerId: user.id,
            status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
            preferredDate: { gte: new Date() },
          },
        }),
        db.property.findMany({
          where: { status: "PUBLISHED" },
          include: propertyListInclude,
          orderBy: [{ featured: "desc" }, { views: "desc" }],
          take: 3,
        }),
      ]);
      return ok({ favourites, enquiries, upcomingVisits, recentProperties: recentProps.map(toCard) });
    }

    if (user.role === "SELLER") {
      const [total, published, pending, sold, viewsAgg, totalLeads, upcomingVisits] = await Promise.all([
        db.property.count({ where: { sellerId: user.id } }),
        db.property.count({ where: { sellerId: user.id, status: "PUBLISHED" } }),
        db.property.count({ where: { sellerId: user.id, status: "PENDING" } }),
        db.property.count({ where: { sellerId: user.id, availability: "SOLD" } }),
        db.property.aggregate({ where: { sellerId: user.id }, _sum: { views: true } }),
        db.lead.count({ where: { property: { sellerId: user.id } } }),
        db.siteVisit.count({
          where: {
            property: { sellerId: user.id },
            status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
            preferredDate: { gte: new Date() },
          },
        }),
      ]);
      return ok({
        totalProperties: total,
        published,
        pending,
        sold,
        totalViews: viewsAgg._sum.views ?? 0,
        totalEnquiries: totalLeads,
        upcomingVisits,
      });
    }

    if (user.role === "BUILDER") {
      const builderId = user.builderProfile?.id ?? "none";
      const [totalProjects, publishedProjects, units, availableUnits, totalLeads, upcomingVisits, viewsAgg] =
        await Promise.all([
          db.project.count({ where: { builderId } }),
          db.project.count({ where: { builderId, status: "PUBLISHED" } }),
          db.property.count({ where: { builderId } }),
          db.property.count({ where: { builderId, availability: "AVAILABLE" } }),
          db.lead.count({ where: { property: { builderId } } }),
          db.siteVisit.count({
            where: {
              property: { builderId },
              status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
              preferredDate: { gte: new Date() },
            },
          }),
          db.property.aggregate({ where: { builderId }, _sum: { views: true } }),
        ]);
      return ok({
        totalProjects,
        publishedProjects,
        totalUnits: units,
        availableUnits,
        totalEnquiries: totalLeads,
        upcomingVisits,
        totalViews: viewsAgg._sum.views ?? 0,
      });
    }

    if (user.role === "TEAM") {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const [assigned, open, dueFollowUps, upcomingVisits] = await Promise.all([
        db.lead.count({ where: { assignedToId: user.id } }),
        db.lead.count({
          where: { assignedToId: user.id, status: { notIn: ["CONVERTED", "LOST"] } },
        }),
        db.lead.count({
          where: {
            assignedToId: user.id,
            followUpDate: { lte: endOfToday },
            status: { notIn: ["CONVERTED", "LOST"] },
          },
        }),
        db.siteVisit.count({
          where: {
            lead: { assignedToId: user.id },
            status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
            preferredDate: { gte: new Date() },
          },
        }),
      ]);
      return ok({ assigned, open, dueFollowUps, upcomingVisits });
    }

    // ADMIN → redirect consumers to /api/admin/stats
    return ok({ useAdminStats: true });
  });
}
