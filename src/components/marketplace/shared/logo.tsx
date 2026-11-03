"use client";

import { cn } from "@/lib/utils";

/** Vasati brand mark — a refined "V" arch over a foundation line. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span className="relative grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 11.5 12 4l8 7.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 11v8.5h11V11"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10.2 19.5v-4.6h3.6v4.6" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[1.35rem] font-semibold tracking-tight text-foreground">
          Vasati
        </span>
      )}
    </span>
  );
}
