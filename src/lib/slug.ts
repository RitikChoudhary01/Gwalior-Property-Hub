// ============================================================
// Slugs and business document references
// ============================================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ensures uniqueness by appending a short random suffix when needed. */
export function uniqueSlug(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugify(base)}-${suffix}`;
}

/** Lead reference, e.g. VAS-2025-000421 */
export function leadReference(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(100000 + Math.random() * 900000);
  return `VAS-${year}-${num}`;
}

/** Requirement reference, e.g. VAS-REQ-2025-000132 */
export function requirementReference(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(100000 + Math.random() * 900000);
  return `VAS-REQ-${year}-${num}`;
}

/** Transaction reference, e.g. VAS-TXN-2025-00187 */
export function transactionReference(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `VAS-TXN-${year}-${num}`;
}

/** Agreement reference, e.g. VAS-AGR-BLD-0012 */
export function agreementReference(party: "SLR" | "BLD"): string {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `VAS-AGR-${party}-${year}-${num}`;
}
