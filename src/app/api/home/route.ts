// ============================================================
// GET /api/home — single combined endpoint for the homepage.
// Replaces 5 separate client-side API calls with one round-trip,
// cutting cold-start latency dramatically for Indian users.
//
// Returns: featured properties, recent properties, featured
// projects, city counts, and insights — all in one DB roundtrip.
// CDN-cached at the edge for 60 s (stale-while-revalidate 120 s).
// ============================================================

import { db } from "@/lib/db";
import { handle, okPublic } from "@/lib/api-helpers";
import { propertyListInclude, toCard, projectListInclude, projectToCard } from "@/lib/serializers";
import { getLocalityStats } from "@/lib/insights";
import { memoryCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const CACHE_KEY = "home:bundle";
    const cached = memoryCache.get(CACHE_KEY);
    if (cached) return okPublic(cached);

    // Run all queries in parallel — single DB round-trip burst
    const [featured, recent, projects, insightLocalities, insightTotal, cityGroups] =
      await Promise.all([
        // 6 featured properties
        db.property.findMany({
          where: { status: "PUBLISHED", featured: true },
          include: propertyListInclude,
          orderBy: [{ createdAt: "desc" }],
          take: 6,
        }),

        // 6 most-recent properties
        db.property.findMany({
          where: { status: "PUBLISHED" },
          include: propertyListInclude,
          orderBy: [{ createdAt: "desc" }],
          take: 6,
        }),

        // 3 featured projects
        db.project.findMany({
          where: { status: "PUBLISHED" },
          include: projectListInclude,
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          take: 3,
        }),

        // Locality insights (top 6)
        getLocalityStats({ limit: 6 }),

        // Total published listing count for insights header
        db.property.count({
          where: {
            status: "PUBLISHED",
            availability: { in: ["AVAILABLE", "RESERVED"] },
          },
        }),

        // Per-city listing counts
        db.property.groupBy({
          by: ["city"],
          where: { status: "PUBLISHED" },
          _count: { _all: true },
        }),
      ]);

    // Build city counts map
    const cityCounts: Record<string, number> = {};
    for (const g of cityGroups) {
      cityCounts[g.city] = g._count._all;
    }

    const result = {
      featured: {
        data: featured.map(toCard),
        pagination: { page: 1, pageSize: 6, total: featured.length, totalPages: 1 },
      },
      recent: {
        data: recent.map(toCard),
        pagination: { page: 1, pageSize: 6, total: recent.length, totalPages: 1 },
      },
      projects: {
        data: projects.map(projectToCard),
        pagination: { page: 1, pageSize: 3, total: projects.length, totalPages: 1 },
      },
      insights: {
        city: null,
        totalListings: insightTotal,
        localities: insightLocalities,
      },
      cityCounts,
    };

    // Cache in-process for 60 s (also CDN-cached via okPublic headers)
    memoryCache.set(CACHE_KEY, result, 60_000);

    return okPublic(result);
  });
}

