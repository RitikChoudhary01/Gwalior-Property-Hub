"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  LEAD_STATUSES,
  VISIT_STATUSES,
  PROPERTY_STATUSES,
  TRANSACTION_STATUSES,
  REQUIREMENT_STATUSES,
} from "@/lib/constants";

const FALLBACK_TONES: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  PENDING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  INACTIVE: "bg-stone-200 text-stone-600",
  SOLD: "bg-stone-900 text-white",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RESERVED: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-rose-100 text-rose-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  REQUESTED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-rose-100 text-rose-800",
  NEW: "bg-sky-100 text-sky-800",
  VERIFIED: "bg-emerald-100 text-emerald-800",
  NONE: "bg-stone-100 text-stone-600",
};

function labelFor(status: string): string {
  for (const s of LEAD_STATUSES) if (s.value === status) return s.label;
  for (const s of VISIT_STATUSES) if (s.value === status) return s.label;
  for (const s of PROPERTY_STATUSES) if (s.value === status) return s.label;
  for (const s of TRANSACTION_STATUSES) if (s.value === status) return s.label;
  for (const s of REQUIREMENT_STATUSES) if (s.value === status) return s.label;
  if (status === "PAYMENT_PENDING") return "Payment Pending";
  if (status === "VERIFIED") return "GPH Verified";
  if (status === "REQUESTED") return "Verification Requested";
  if (status === "NONE") return "Not verified";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const REQUIREMENT_TONES = Object.fromEntries(REQUIREMENT_STATUSES.map((s) => [s.value, s.tone]));

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone =
    REQUIREMENT_TONES[status] ??
    LEAD_STATUSES.find((s) => s.value === status)?.tone ??
    VISIT_STATUSES.find((s) => s.value === status)?.tone ??
    FALLBACK_TONES[status] ??
    "bg-stone-100 text-stone-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tone,
        className
      )}
    >
      {labelFor(status)}
    </span>
  );
}

export function VerifiedBadge({ verified, label = "Verified" }: { verified: boolean; label?: string }) {
  if (!verified)
    return (
      <Badge variant="outline" className="gap-1 bg-white/90 text-stone-600 border-stone-300">
        <ShieldAlert className="size-3 text-amber-600" aria-hidden="true" />
        {label === "Verified" ? "Unverified" : label}
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-white/90 text-emerald-800 border border-emerald-300 hover:bg-white/90">
      <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
      {label}
    </Badge>
  );
}

/**
 * Listing-level legal verification badge. Shown ONLY when Gwalior Property Hub has
 * actually completed document verification for this specific listing
 * (Property.verificationStatus === "VERIFIED"). Identity / RERA checks
 * on the seller do NOT qualify — those use VerifiedBadge with an
 * identity-scoped label instead.
 */
export function ListingVerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "gap-1 border border-emerald-300 bg-white/90 text-emerald-800 shadow-sm hover:bg-white/90",
        className
      )}
      title="Ownership documents reviewed by Gwalior Property Hub"
    >
      <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
      GPH Verified
    </Badge>
  );
}

/** Neutral chip for an in-progress listing verification. */
export function VerificationPendingBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 bg-white/90 text-stone-600 border-stone-300", className)}
    >
      <ShieldAlert className="size-3.5 text-amber-600" aria-hidden="true" />
      Verification in progress
    </Badge>
  );
}
