// ============================================================
// Locality price intelligence — computed live from approved
// (PUBLISHED) inventory only. No external data, no fake
// numbers: every stat buyers see is derived from real
// listings on the platform.
// ============================================================

import "server-only";
import { db } from "@/lib/db";

export interface LocalityStat {
  locality: string;
  city: string;
  listingCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  /** Average listed price per sq ft; null when too few listings report a usable area. */
  avgPricePerSqft: number | null;
  /** How many of the locality's listings contribute to the ₹/sq ft figure. */
  pricedByAreaCount: number;
  verifiedCount: number;
  mainImage: string | null;
}

const LIVE_AVAILABILITY = ["AVAILABLE", "RESERVED"] as const;

/** Usable floor area for price-per-sqft (plots are priced by plot area). */
function areaForPricing(p: { type: string; carpetArea: number | null; builtUpArea: number | null; plotArea: number | null }): number | null {
  const area = p.type === "Plot" ? p.plotArea ?? p.builtUpArea : p.carpetArea ?? p.builtUpArea;
  return area && area >= 100 ? area : null;
}

/**
 * Aggregates live inventory into per-locality stats.
 * Results are sorted by listing count (desc) and capped at `limit`.
 */
export async function getLocalityStats(opts: { city?: string | null; limit?: number } = {}): Promise<LocalityStat[]> {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 24);

  const properties = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      availability: { in: [...LIVE_AVAILABILITY] },
      ...(opts.city ? { city: opts.city } : {}),
    },
    select: {
      id: true,
      type: true,
      city: true,
      locality: true,
      price: true,
      carpetArea: true,
      builtUpArea: true,
      plotArea: true,
      verificationStatus: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, isMain: true }, take: 1 },
    },
    take: 500,
  });

  const groups = new Map<string, LocalityStat>();

  for (const p of properties) {
    const key = `${p.city}\u0000${p.locality}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        locality: p.locality,
        city: p.city,
        listingCount: 0,
        avgPrice: 0,
        minPrice: p.price,
        maxPrice: p.price,
        avgPricePerSqft: null,
        pricedByAreaCount: 0,
        verifiedCount: 0,
        mainImage: (p.images.find((i) => i.isMain) ?? p.images[0])?.url ?? null,
      };
      // running totals stored on the fly below
      (g as LocalityStat & { _priceSum: number; _sqftSum: number })._priceSum = 0;
      (g as LocalityStat & { _sqftSum: number })._sqftSum = 0;
      groups.set(key, g);
    }
    const acc = g as LocalityStat & { _priceSum: number; _sqftSum: number };
    acc.listingCount += 1;
    acc._priceSum += p.price;
    acc.minPrice = Math.min(acc.minPrice, p.price);
    acc.maxPrice = Math.max(acc.maxPrice, p.price);
    if (p.verificationStatus === "VERIFIED") acc.verifiedCount += 1;
    const area = areaForPricing(p);
    if (area != null) {
      acc.pricedByAreaCount += 1;
      acc._sqftSum += p.price / area;
    }
    if (!acc.mainImage) {
      acc.mainImage = (p.images.find((i) => i.isMain) ?? p.images[0])?.url ?? null;
    }
  }

  const stats = [...groups.values()]
    .map((g) => {
      const acc = g as LocalityStat & { _priceSum: number; _sqftSum: number };
      const stat: LocalityStat = {
        locality: g.locality,
        city: g.city,
        listingCount: g.listingCount,
        avgPrice: Math.round(acc._priceSum / g.listingCount),
        minPrice: g.minPrice,
        maxPrice: g.maxPrice,
        // Only publish ₹/sqft when at least 2 listings report a usable area —
        // a single data point would misrepresent the market.
        avgPricePerSqft: acc.pricedByAreaCount >= 2 ? Math.round(acc._sqftSum / acc.pricedByAreaCount) : null,
        pricedByAreaCount: acc.pricedByAreaCount,
        verifiedCount: g.verifiedCount,
        mainImage: g.mainImage,
      };
      return stat;
    })
    .sort((a, b) => b.listingCount - a.listingCount || b.avgPrice - a.avgPrice);

  return stats.slice(0, limit);
}

export interface LocalitySnapshot {
  locality: string;
  city: string;
  /** Other live listings in the same locality (excludes the subject listing). */
  listingCount: number;
  avgPrice: number;
  avgPricePerSqft: number | null;
  thisPricePerSqft: number | null;
  /** % difference of this home's ₹/sqft vs the locality average (null when unknown). */
  vsLocalityPct: number | null;
}

/**
 * Snapshot of one listing's locality, used on the property detail page
 * to give buyers price context ("priced like similar homes nearby").
 */
export async function getLocalitySnapshot(property: {
  id: string;
  type: string;
  city: string;
  locality: string;
  price: number;
  carpetArea: number | null;
  builtUpArea: number | null;
  plotArea: number | null;
}): Promise<LocalitySnapshot | null> {
  const neighbours = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      availability: { in: [...LIVE_AVAILABILITY] },
      city: property.city,
      locality: property.locality,
      id: { not: property.id },
    },
    select: { price: true, type: true, carpetArea: true, builtUpArea: true, plotArea: true },
    take: 100,
  });

  if (neighbours.length === 0) return null;

  const avgPrice = Math.round(neighbours.reduce((s, n) => s + n.price, 0) / neighbours.length);

  const pricedNeighbours = neighbours
    .map((n) => ({ price: n.price, area: areaForPricing(n) }))
    .filter((n): n is { price: number; area: number } => n.area != null);

  const thisArea = areaForPricing(property);
  const thisPricePerSqft = thisArea != null ? Math.round(property.price / thisArea) : null;

  let avgPricePerSqft: number | null = null;
  let vsLocalityPct: number | null = null;
  // The comparison card discloses the sample size ("from N other homes"),
  // so a single priced neighbour is still an honest point of reference.
  if (pricedNeighbours.length >= 1 && thisPricePerSqft != null) {
    avgPricePerSqft = Math.round(
      pricedNeighbours.reduce((s, n) => s + n.price / n.area, 0) / pricedNeighbours.length
    );
    vsLocalityPct = Math.round(((thisPricePerSqft - avgPricePerSqft) / avgPricePerSqft) * 100);
  }

  return {
    locality: property.locality,
    city: property.city,
    listingCount: neighbours.length,
    avgPrice,
    avgPricePerSqft,
    thisPricePerSqft,
    vsLocalityPct,
  };
}
