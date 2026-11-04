import { db } from "@/lib/db";
import { ok, handle, rateLimit, clientIp } from "@/lib/api-helpers";
import { getLocalityStats } from "@/lib/insights";

export const dynamic = "force-dynamic";

// --------------------------------------------------------------
// GET /api/insights?city=Mumbai&limit=8
// Public locality price intelligence, computed live from
// PUBLISHED inventory. Powers the "market pulse" surfaces.
// --------------------------------------------------------------

export async function GET(req: Request) {
  return handle(async () => {
    // Light abuse guard only — this is a public, read-only endpoint.
    if (!rateLimit(`insights:${clientIp(req)}`, 60, 60_000)) {
      return ok({ city: null, totalListings: 0, localities: [] });
    }

    const url = new URL(req.url);
    const cityParam = url.searchParams.get("city")?.trim();
    const limitParam = Number(url.searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(limitParam) ? limitParam : 8;

    const [localities, totalListings] = await Promise.all([
      getLocalityStats({ city: cityParam || null, limit }),
      db.property.count({
        where: {
          status: "PUBLISHED",
          availability: { in: ["AVAILABLE", "RESERVED"] },
          ...(cityParam ? { city: cityParam } : {}),
        },
      }),
    ]);

    return ok({ city: cityParam ?? null, totalListings, localities });
  });
}
