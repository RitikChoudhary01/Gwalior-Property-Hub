"use client";

// ============================================================
// Shared dashboard primitives — data-fetch hook, tab sync with
// the URL, filter bars, table chrome and the visits board used
// by both the builder and the admin dashboards.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber, initials } from "@/lib/format";
import { ROLE_LABELS, VISIT_STATUSES, VISIT_TIME_SLOTS } from "@/lib/constants";
import type { Pagination, SiteVisitDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "../../../shared/section";
import { StatusBadge } from "../../../shared/status-badge";

// ------------------------------------------------------------
// Query-string helper
// ------------------------------------------------------------

export function qs(params: Record<string, string | number | undefined | null | false>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ------------------------------------------------------------
// Data hooks
// ------------------------------------------------------------

export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetcher();
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);

  return { data, loading, error, refetch };
}

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Tab state derived from /dashboard?tab=x — the URL is the source of truth. */
export function useDashboardTab(
  validTabs: readonly string[],
  initialTab?: string
): [string, (tab: string) => void] {
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);
  const routeTab = route.query.get("tab") ?? "";
  const tab =
    routeTab && validTabs.includes(routeTab)
      ? routeTab
      : !routeTab && initialTab && validTabs.includes(initialTab)
        ? initialTab
        : validTabs[0];

  const select = useCallback(
    (next: string) => {
      if (!validTabs.includes(next) || next === tab) return;
      navigate(`/dashboard?tab=${next}`, { replace: true });
    },
    [tab, navigate, validTabs]
  );

  return [tab, select];
}

// ------------------------------------------------------------
// Mutation helper — toast + refetch + friendly errors
// ------------------------------------------------------------

export async function runAction(
  fn: () => Promise<unknown>,
  success: string,
  opts?: { description?: string; onDone?: () => void }
): Promise<boolean> {
  try {
    await fn();
    toast.success(success, opts?.description ? { description: opts.description } : undefined);
    opts?.onDone?.();
    return true;
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    return false;
  }
}

// ------------------------------------------------------------
// Layout chrome
// ------------------------------------------------------------

export function TabIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {title || action ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4 sm:p-5">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl" />
      ))}
    </div>
  );
}

export function LoadError({
  message = "We could not load this data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-4 sm:p-5">
      <EmptyState
        icon={<AlertTriangle className="size-6" aria-hidden="true" />}
        title="Something went wrong"
        description={message}
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

// ------------------------------------------------------------
// Filters
// ------------------------------------------------------------

export function ChipBar({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Filter results",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterBar({
  search,
  onSearchChange,
  placeholder = "Search…",
  ariaLabel,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="pl-9"
        />
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------
// Table pager
// ------------------------------------------------------------

export function TablePager({
  pagination,
  onPage,
  unit = "results",
}: {
  pagination: Pagination | null | undefined;
  onPage: (page: number) => void;
  unit?: string;
}) {
  if (!pagination || pagination.total === 0) return null;
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) {
    return (
      <p className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
        {formatNumber(total)} {unit}
      </p>
    );
  }

  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let p = from; p <= to; p++) pages.push(p);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {formatNumber(total)} {unit}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Prev
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            className="size-8 text-xs"
            onClick={() => onPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Small presentational atoms
// ------------------------------------------------------------

export function CountBar({
  label,
  value,
  max,
  barClassName,
}: {
  label: string;
  value: number;
  max: number;
  barClassName?: string;
}) {
  const pct = max > 0 ? Math.max(3, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-foreground">{label}</span>
        <span className="font-medium tabular-nums text-muted-foreground">{formatNumber(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className={cn("h-full rounded-full bg-primary/75", barClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ImgThumb({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <MapPin className="size-4" aria-hidden="true" />
      )}
    </div>
  );
}

export function AvatarInitials({ name, className }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className
      )}
    >
      {initials(name)}
    </div>
  );
}

const ROLE_TONES: Record<string, string> = {
  BUYER: "bg-stone-100 text-stone-700",
  SELLER: "bg-teal-100 text-teal-800",
  BUILDER: "bg-emerald-100 text-emerald-800",
  TEAM: "bg-cyan-100 text-cyan-800",
  ADMIN: "bg-amber-100 text-amber-800",
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        ROLE_TONES[role] ?? "bg-stone-100 text-stone-700",
        className
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ------------------------------------------------------------
// Reschedule dialog + visits board (shared by both dashboards)
// ------------------------------------------------------------

export function RescheduleVisitDialog({
  visit,
  onClose,
  onDone,
}: {
  visit: SiteVisitDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(visit.preferredDate ? visit.preferredDate.slice(0, 10) : "");
  const [time, setTime] = useState(visit.preferredTime ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!date) {
      setError("Pick a new date for the visit.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/site-visits/${visit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "RESCHEDULED",
          preferredDate: date,
          preferredTime: time || undefined,
        }),
      });
      toast.success("Visit rescheduled", {
        description: `${visit.property.title} — ${formatDate(date)}${time ? ` at ${time}` : ""}`,
      });
      onClose();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reschedule the visit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule site visit</DialogTitle>
          <DialogDescription>
            {visit.property.title} — currently {formatDate(visit.preferredDate)} at{" "}
            {visit.preferredTime}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="visit-date">New date</Label>
            <Input
              id="visit-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="visit-time">New time slot</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="visit-time" className="w-full">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            <CalendarClock className="size-4" aria-hidden="true" />
            Reschedule visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VisitCard({
  visit,
  busy,
  onStatus,
  onReschedule,
}: {
  visit: SiteVisitDTO;
  busy: boolean;
  onStatus: (visit: SiteVisitDTO, status: string, success: string, description?: string) => void;
  onReschedule: (visit: SiteVisitDTO) => void;
}) {
  const status = visit.status;
  const canConfirm = status === "REQUESTED";
  const canReschedule = ["REQUESTED", "CONFIRMED", "RESCHEDULED"].includes(status);
  const canComplete = ["CONFIRMED", "RESCHEDULED"].includes(status);
  const canCancel = ["REQUESTED", "CONFIRMED", "RESCHEDULED"].includes(status);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <ImgThumb src={visit.property.mainImage} alt="" className="size-12 rounded-lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground">{visit.property.title}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {visit.property.locality}, {visit.property.city}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t px-4 py-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Visitor</dt>
          <dd className="mt-0.5 font-medium text-foreground">{visit.contactName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contact</dt>
          <dd className="mt-0.5 font-medium">
            <a href={`tel:${visit.contactPhone}`} className="text-primary hover:underline">
              {visit.contactPhone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="mt-0.5 font-medium text-foreground">{formatDate(visit.preferredDate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Time</dt>
          <dd className="mt-0.5 font-medium text-foreground">{visit.preferredTime}</dd>
        </div>
        {visit.notes ? (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="mt-0.5 text-foreground">{visit.notes}</dd>
          </div>
        ) : null}
      </dl>
      {canConfirm || canReschedule || canComplete || canCancel ? (
        <div className="mt-auto flex flex-wrap gap-2 border-t px-4 py-3">
          {canConfirm ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                onStatus(
                  visit,
                  "CONFIRMED",
                  "Visit confirmed",
                  `${formatDate(visit.preferredDate)} at ${visit.preferredTime}`
                )
              }
            >
              <Check className="size-4" aria-hidden="true" />
              Confirm
            </Button>
          ) : null}
          {canReschedule ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onReschedule(visit)}>
              <CalendarClock className="size-4" aria-hidden="true" />
              Reschedule
            </Button>
          ) : null}
          {canComplete ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onStatus(visit, "COMPLETED", "Visit marked completed", visit.property.title)}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Complete
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              className="text-rose-600 hover:text-rose-700"
              onClick={() => onStatus(visit, "CANCELLED", "Visit cancelled", visit.property.title)}
            >
              <X className="size-4" aria-hidden="true" />
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function VisitsBoard({
  title = "Site visits",
  description,
}: {
  title?: string;
  description?: string;
}) {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<SiteVisitDTO | null>(null);

  const { data, loading, error, refetch } = useApiData<{ data: SiteVisitDTO[]; pagination?: Pagination }>(
    () => api(`/api/site-visits${qs({ status: status !== "ALL" ? status : null, page, pageSize: 12 })}`),
    [status, page]
  );

  function onStatusChange(next: string) {
    setStatus(next);
    setPage(1);
  }

  async function onStatus(
    visit: SiteVisitDTO,
    nextStatus: string,
    success: string,
    description?: string
  ) {
    setBusyId(visit.id);
    await runAction(
      () =>
        api(`/api/site-visits/${visit.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }),
      success,
      { description, onDone: refetch }
    );
    setBusyId(null);
  }

  const visits = data?.data ?? [];

  return (
    <div className="space-y-4">
      <TabIntro eyebrow="Site visits" title={title} description={description} />
      <ChipBar
        value={status}
        onChange={onStatusChange}
        options={[
          { value: "ALL", label: "All" },
          ...VISIT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
        ]}
      />
      {loading ? (
        <SkeletonCards count={6} />
      ) : error ? (
        <AdminCard>
          <LoadError message={error} onRetry={refetch} />
        </AdminCard>
      ) : visits.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6" aria-hidden="true" />}
          title="No site visits found"
          description={
            status === "ALL"
              ? "When buyers request a property visit, it will appear here for you to coordinate."
              : `No visits with status "${VISIT_STATUSES.find((s) => s.value === status)?.label ?? status}".`
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                busy={busyId === visit.id}
                onStatus={onStatus}
                onReschedule={setRescheduling}
              />
            ))}
          </div>
          <AdminCard>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="visits" />
          </AdminCard>
        </div>
      )}
      {rescheduling ? (
        <RescheduleVisitDialog
          key={rescheduling.id}
          visit={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={refetch}
        />
      ) : null}
    </div>
  );
}
