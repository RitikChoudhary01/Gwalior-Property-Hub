// ============================================================
// Formatting helpers — Indian numbering system (Lakhs / Crores)
// ============================================================

/** Compact INR display: ₹1.25 Cr / ₹85 Lac / ₹45,000 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "Price on request";
  if (value >= 10000000) {
    const cr = value / 10000000;
    return `₹${trimDecimals(cr)} Cr`;
  }
  if (value >= 100000) {
    const lac = value / 100000;
    return `₹${trimDecimals(lac)} Lac`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

/** Full INR display with Indian digit grouping: ₹1,45,00,000 */
export function formatPriceFull(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

function trimDecimals(n: number): string {
  const fixed = n.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

/** Price range display: ₹1.4 Cr - 2.3 Cr */
export function formatPriceRange(min?: number | null, max?: number | null): string {
  if (min && max) return `${formatPrice(min)} - ${formatPrice(max)}`;
  if (min) return `From ${formatPrice(min)}`;
  if (max) return `Up to ${formatPrice(max)}`;
  return "Price on request";
}

/** 1,245 sq.ft */
export function formatArea(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("en-IN")} sq.ft`;
}

/** ₹12,450/sq.ft */
export function formatPricePerSqft(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}/sq.ft`;
}

/** +12% / −8% / on par */
export function formatSignedPct(value: number | null | undefined): string {
  if (value == null || value === 0) return "on par";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}%`;
}

/** 12 Mar 2025 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** 12 Mar 2025, 11:30 AM */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Relative time: "2 days ago" / "in 3 days" */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const absDays = Math.abs(Math.round(diffMs / 86400000));
  const absHours = Math.abs(Math.round(diffMs / 3600000));
  const absMins = Math.abs(Math.round(diffMs / 60000));
  let unit: string;
  let val: number;
  if (absDays >= 1) {
    unit = absDays === 1 ? "day" : "days";
    val = absDays;
  } else if (absHours >= 1) {
    unit = absHours === 1 ? "hour" : "hours";
    val = absHours;
  } else {
    unit = absMins === 1 ? "minute" : "minutes";
    val = absMins;
  }
  return diffMs >= 0 ? `in ${val} ${unit}` : `${val} ${unit} ago`;
}

/** Member since / listed on — "Mar 2025" */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString("en-IN");
}

/** "3 BHK" / "Plot" */
export function formatConfig(bhk: number | null, type: string): string {
  if (type === "Plot") return "Residential Plot";
  return bhk ? `${bhk} BHK` : type;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
