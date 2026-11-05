"use client";

import { cn } from "@/lib/utils";

/** Gwalior Property Hub brand mark — an arch over a foundation line. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 sm:gap-2.5 select-none shrink-0", className)}>
      <span className="relative grid size-8 sm:size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:size-5">
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
        <span className="font-display text-sm sm:text-[1.35rem] font-semibold tracking-tight text-foreground whitespace-nowrap">
          <span className="hidden sm:inline">Gwalior </span>
          <span>Property</span>
          <span className="font-normal text-foreground/60 hidden min-[360px]:inline"> Hub</span>
        </span>
      )}
    </span>
  );
}
