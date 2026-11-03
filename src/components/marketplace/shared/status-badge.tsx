"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import {
  LEAD_STATUSES,
  VISIT_STATUSES,
  PROPERTY_STATUSES,
  TRANSACTION_STATUSES,
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
};

function labelFor(status: string): string {
  for (const s of LEAD_STATUSES) if (s.value === status) return s.label;
  for (const s of VISIT_STATUSES) if (s.value === status) return s.label;
  for (const s of PROPERTY_STATUSES) if (s.value === status) return s.label;
  for (const s of TRANSACTION_STATUSES) if (s.value === status) return s.label;
  if (status === "PAYMENT_PENDING") return "Payment Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone =
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
