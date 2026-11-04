// ============================================================
// Requirement ⇄ Property matching engine.
//
// Pure, dependency-free scoring used by the requirements API to
// surface approved inventory that fits a buyer's posted
// requirement. Scores are computed server-side so buyers and the
// internal team always see the same matches.
//
// Total score = 100:
//   Budget fit      40
//   Locality fit    25
//   Property type   15
//   BHK             10
//   Listing quality 10
// ============================================================

export interface RequirementCriteria {
  city: string;
  localities?: string | null; // comma-separated preferred localities
  propertyType?: string | null; // "Any" | Apartment | Villa | ...
  bhk?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}

export interface MatchableProperty {
  id: string;
  slug: string;
  title: string;
  city: string;
  locality: string;
  type: string;
  bhk?: number | null;
  price: number;
  reraNumber?: string | null;
  verificationStatus?: string | null;
  imageCount: number;
}

export interface PropertyMatch {
  property: MatchableProperty;
  score: number; // 0–100
  reasons: string[]; // human-readable explanations for the match
}

// Types a buyer will accept when their preference is one of these.
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  Apartment: ["Apartment", "Flat"],
  Flat: ["Flat", "Apartment"],
  Villa: ["Villa", "Independent House"],
  "Independent House": ["Independent House", "Villa"],
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseLocalities(localities?: string | null): string[] {
  if (!localities) return [];
  return localities
    .split(",")
    .map((l) => normalize(l))
    .filter(Boolean);
}

function scoreBudget(p: MatchableProperty, c: RequirementCriteria): { pts: number; reason?: string } {
  const min = c.budgetMin ?? null;
  const max = c.budgetMax ?? null;
  if (min == null && max == null) return { pts: 40, reason: "Any budget" };

  if (max != null && p.price <= max && (min == null || p.price >= min)) {
    return { pts: 40, reason: "Within your budget" };
  }
  // Slight stretch above the top of the range is still worth showing.
  if (max != null && p.price <= Math.round(max * 1.1)) {
    return { pts: 28, reason: "Just above your budget" };
  }
  if (max != null && p.price <= Math.round(max * 1.25)) {
    return { pts: 15, reason: "Up to 25% above budget" };
  }
  // Below the floor of the range — often too small/cheap for the buyer.
  if (min != null && max == null && p.price >= min) return { pts: 40, reason: "Within your budget" };
  return { pts: 0 };
}

function scoreLocality(p: MatchableProperty, c: RequirementCriteria): { pts: number; reason?: string } {
  const prefs = parseLocalities(c.localities);
  if (prefs.length === 0) {
    return normalize(p.city) === normalize(c.city) ? { pts: 25, reason: "In your city" } : { pts: 0 };
  }
  if (prefs.includes(normalize(p.locality))) {
    return { pts: 25, reason: `In ${p.locality}` };
  }
  if (normalize(p.city) === normalize(c.city)) {
    return { pts: 8, reason: "In your city" };
  }
  return { pts: 0 };
}

function scoreType(p: MatchableProperty, c: RequirementCriteria): { pts: number; reason?: string } {
  const wanted = (c.propertyType ?? "Any").trim();
  if (!wanted || wanted.toLowerCase() === "any") return { pts: 15, reason: "Any property type" };
  if (normalize(wanted) === normalize(p.type)) {
    return { pts: 15, reason: `${p.type} as requested` };
  }
  const compatible = TYPE_COMPATIBILITY[wanted] ?? [wanted];
  if (compatible.some((t) => normalize(t) === normalize(p.type))) {
    return { pts: 9, reason: `${p.type} — similar to ${wanted}` };
  }
  return { pts: 0 };
}

function scoreBhk(p: MatchableProperty, c: RequirementCriteria): { pts: number; reason?: string } {
  if (c.bhk == null) return { pts: 10, reason: "Any configuration" };
  if (p.bhk == null) return { pts: 5 };
  if (p.bhk === c.bhk) return { pts: 10, reason: `${p.bhk} BHK as requested` };
  if (Math.abs(p.bhk - c.bhk) === 1) return { pts: 5, reason: `${p.bhk} BHK — close to your preference` };
  return { pts: 0 };
}

function scoreQuality(p: MatchableProperty): { pts: number; reasons: string[] } {
  let pts = 0;
  const reasons: string[] = [];
  if (p.imageCount >= 3) {
    pts += 4;
    reasons.push("Photos");
  }
  if (p.reraNumber) {
    pts += 3;
    reasons.push("RERA registered");
  }
  if (p.verificationStatus === "VERIFIED") {
    pts += 3;
    reasons.push("GPH Verified");
  }
  return { pts, reasons };
}

/** Minimum score for a property to be surfaced as a match. */
export const MATCH_THRESHOLD = 50;

/**
 * Scores properties against a requirement. Only same-city properties can
 * match; results are sorted by score (desc) and capped at `limit`.
 */
export function matchProperties(
  criteria: RequirementCriteria,
  properties: MatchableProperty[],
  limit = 12
): PropertyMatch[] {
  const results: PropertyMatch[] = [];

  for (const p of properties) {
    if (normalize(p.city) !== normalize(criteria.city)) continue;

    const budget = scoreBudget(p, criteria);
    const locality = scoreLocality(p, criteria);
    const type = scoreType(p, criteria);
    const bhk = scoreBhk(p, criteria);
    const quality = scoreQuality(p);

    const score = budget.pts + locality.pts + type.pts + bhk.pts + quality.pts;
    if (score < MATCH_THRESHOLD) continue;

    const reasons = [budget.reason, locality.reason, type.reason, bhk.reason, ...quality.reasons].filter(
      (r): r is string => Boolean(r)
    );

    results.push({ property: p, score, reasons: reasons.slice(0, 4) });
  }

  return results.sort((a, b) => b.score - a.score || a.property.price - b.property.price).slice(0, limit);
}
