"use client";

// ============================================================
// JourneyTracker — the buyer-facing view of the Vasati
// assisted pipeline. Every enquiry (lead) progresses through
// the same stages the internal CRM uses, and this component
// shows buyers exactly where they stand and what happens next.
// No competitor portal gives buyers this visibility.
// ============================================================

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Buyer-facing journey stages, in order. */
const STAGES = [
  { key: "enquiry", label: "Enquiry", short: "Enquiry raised" },
  { key: "contacted", label: "Advisor call", short: "Advisor called you" },
  { key: "qualified", label: "Qualified", short: "Needs confirmed" },
  { key: "visit", label: "Site visit", short: "Visit scheduled" },
  { key: "negotiation", label: "Negotiation", short: "Terms in discussion" },
  { key: "booked", label: "Booked", short: "Booking confirmed" },
] as const;

/** CRM status → stage progress. `stage` = number of completed stages (0–6). */
function stageProgress(status: string): { completed: number; active: number; lost: boolean } {
  switch (status) {
    case "NEW":
      return { completed: 0, active: 0, lost: false };
    case "CONTACTED":
      return { completed: 1, active: 1, lost: false };
    case "QUALIFIED":
      return { completed: 2, active: 2, lost: false };
    case "SITE_VISIT_SCHEDULED":
      return { completed: 2, active: 3, lost: false };
    case "SITE_VISIT_COMPLETED":
      return { completed: 3, active: 3, lost: false };
    case "NEGOTIATION":
      return { completed: 3, active: 4, lost: false };
    case "BOOKING":
      return { completed: 4, active: 5, lost: false };
    case "CONVERTED":
      return { completed: 6, active: -1, lost: false };
    case "LOST":
      return { completed: 0, active: -1, lost: true };
    default:
      return { completed: 0, active: 0, lost: false };
  }
}

/** What the buyer should expect at each status — plain language, no CRM jargon. */
export const JOURNEY_NEXT_STEP: Record<string, string> = {
  NEW: "Your Vasati advisor will call you within 24 hours.",
  CONTACTED: "Your advisor is confirming your requirements and shortlist.",
  QUALIFIED: "We're lining up a site visit at a time that suits you.",
  SITE_VISIT_SCHEDULED: "Your visit is being coordinated — see the Site visits tab.",
  SITE_VISIT_COMPLETED: "Share your feedback and we'll open price discussions.",
  NEGOTIATION: "We're aligning price and terms with the owner for you.",
  BOOKING: "Booking formalities are in progress — almost there.",
  CONVERTED: "Congratulations — your booking is confirmed!",
  LOST: "This enquiry was closed. Start a new one any time.",
};

export function JourneyTracker({ status, className }: { status: string; className?: string }) {
  const { completed, active, lost } = stageProgress(status);
  const done = active === -1 && !lost ? STAGES.length : completed;
  const pct = Math.round((done / STAGES.length) * 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2" role="group" aria-label="Your enquiry journey">
        {STAGES.map((stage, i) => {
          const isDone = lost ? false : i < done;
          const isActive = !lost && i === active;
          const isLast = i === STAGES.length - 1;
          const lostHere = lost && i === STAGES.length - 1;
          return (
            <div key={stage.key} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors sm:size-8 sm:text-xs",
                    lostHere && "border-destructive/30 bg-destructive/10 text-destructive",
                    isDone && "border-primary bg-primary text-primary-foreground",
                    isActive &&
                      "border-primary bg-background text-primary ring-4 ring-primary/15",
                    !isDone && !isActive && !lostHere &&
                      "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {lostHere ? (
                    <X className="size-3.5" />
                  ) : isDone ? (
                    <Check className="size-3.5 sm:size-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-center text-[10px] font-medium leading-tight sm:text-[11px]",
                    isDone || isActive ? "text-foreground" : "text-muted-foreground",
                    lostHere && "text-destructive"
                  )}
                >
                  {lostHere ? "Closed" : stage.label}
                </span>
              </div>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mb-5 h-0.5 flex-1 rounded-full transition-colors",
                    !lost && i < done ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress summary for screen readers + a visible hint */}
      <p className="mt-3 text-xs text-muted-foreground">
        {lost ? (
          "This enquiry was closed. Start a new one any time."
        ) : done === STAGES.length ? (
          "Journey complete — every stage done."
        ) : (
          <>
            Journey progress:{" "}
            <span className="font-semibold text-foreground">{pct}%</span> ·{" "}
            {JOURNEY_NEXT_STEP[status] ?? "Your advisor will be in touch."}
          </>
        )}
      </p>
    </div>
  );
}
