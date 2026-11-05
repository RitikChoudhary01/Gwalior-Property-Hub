"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, SearchX, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { formatNumber, formatPrice } from "@/lib/format";
import {
  BUDGET_OPTIONS,
  CITIES,
  CONSTRUCTION_STATUSES,
  FURNISHINGS,
  PROPERTY_TYPES,
} from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";
import type { Paginated, Pagination, PropertyCardDTO } from "@/lib/types";
import { PropertyCard } from "../shared/property-card";
import { EmptyState } from "../shared/section";

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const PAGE_SIZE = 12;
/** Sentinel value for "no selection" inside Radix Selects. */
const ANY = "__any__";

/** Query params that drive the property search. */
const FILTER_KEYS = [
  "city",
  "locality",
  "type",
  "minPrice",
  "maxPrice",
  "bhk",
  "bathrooms",
  "furnishing",
  "constructionStatus",
  "verified",
  "q",
] as const;

const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

const BHK_OPTIONS = ["1", "2", "3", "4"];
const BATHROOM_OPTIONS = ["1", "2", "3"];

// ------------------------------------------------------------------
// Filter panel (shared by desktop sidebar and mobile sheet)
// ------------------------------------------------------------------

interface FilterDraft {
  city: string;
  locality: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  bhk: string[];
  bathrooms: string;
  furnishing: string;
  constructionStatus: string;
  verified: boolean;
}

function draftFromParams(query: URLSearchParams): FilterDraft {
  return {
    city: query.get("city") ?? "",
    locality: query.get("locality") ?? "",
    type: query.get("type") ?? "",
    minPrice: query.get("minPrice") ?? "",
    maxPrice: query.get("maxPrice") ?? "",
    bhk: (query.get("bhk") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    bathrooms: query.get("bathrooms") ?? "",
    furnishing: query.get("furnishing") ?? "",
    constructionStatus: query.get("constructionStatus") ?? "",
    verified: query.get("verified") === "1",
  };
}

function FilterPanel({ onApplied }: { onApplied?: () => void }) {
  const navigate = useAppStore((s) => s.navigate);
  const query = useAppStore((s) => s.route.query);
  // Draft state is initialised from the URL at mount; the parent remounts this
  // panel (via `key`) whenever the URL filter params change, keeping it in sync.
  const [draft, setDraft] = useState<FilterDraft>(() => draftFromParams(query));

  const localities = useMemo(
    () => CITIES.find((c) => c.city === draft.city)?.localities ?? [],
    [draft.city]
  );
  const minBudgetOptions = useMemo(
    () => BUDGET_OPTIONS.filter((b) => !draft.maxPrice || Number(b.value) < Number(draft.maxPrice)),
    [draft.maxPrice]
  );
  const maxBudgetOptions = useMemo(
    () => BUDGET_OPTIONS.filter((b) => !draft.minPrice || Number(b.value) > Number(draft.minPrice)),
    [draft.minPrice]
  );

  function update<K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleBhk(value: string) {
    setDraft((d) => ({
      ...d,
      bhk: d.bhk.includes(value) ? d.bhk.filter((v) => v !== value) : [...d.bhk, value],
    }));
  }

  function apply() {
    const params = new URLSearchParams();
    if (draft.city) params.set("city", draft.city);
    if (draft.locality) params.set("locality", draft.locality);
    if (draft.type) params.set("type", draft.type);
    if (draft.minPrice) params.set("minPrice", draft.minPrice);
    if (draft.maxPrice) params.set("maxPrice", draft.maxPrice);
    if (draft.bhk.length) params.set("bhk", [...draft.bhk].sort().join(","));
    if (draft.bathrooms) params.set("bathrooms", draft.bathrooms);
    if (draft.furnishing) params.set("furnishing", draft.furnishing);
    if (draft.constructionStatus) params.set("constructionStatus", draft.constructionStatus);
    if (draft.verified) params.set("verified", "1");
    // carry over the free-text search and sort, which live outside this panel
    const q = query.get("q");
    if (q) params.set("q", q);
    const sort = query.get("sort");
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    navigate(`/properties${qs ? `?${qs}` : ""}`);
    onApplied?.();
  }

  function reset() {
    navigate("/properties");
    onApplied?.();
  }

  return (
    <div className="space-y-5">
      {/* City */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-city" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          City
        </Label>
        <Select
          value={draft.city}
          onValueChange={(v) => {
            const nextCity = v === ANY ? "" : v;
            setDraft((d) => ({ ...d, city: nextCity, locality: "" }));
          }}
        >
          <SelectTrigger id="pf-city" className="w-full">
            <SelectValue placeholder="Any city" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>Any city</SelectItem>
            {draft.city && draft.city !== ANY && !CITIES.some((c) => c.city.toLowerCase() === draft.city.toLowerCase()) && (
              <SelectItem value={draft.city}>
                {draft.city}
              </SelectItem>
            )}
            {CITIES.map((c) => (
              <SelectItem key={c.city} value={c.city}>
                {c.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Locality */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-locality" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Locality
        </Label>
        <Select
          value={draft.locality}
          onValueChange={(v) => update("locality", v === ANY ? "" : v)}
          disabled={!draft.city}
        >
          <SelectTrigger id="pf-locality" className="w-full">
            <SelectValue placeholder={draft.city ? "Any locality" : "Select a city first"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>Any locality</SelectItem>
            {draft.locality && draft.locality !== ANY && !localities.includes(draft.locality) && (
              <SelectItem value={draft.locality}>
                {draft.locality}
              </SelectItem>
            )}
            {localities.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property type */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-type" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Property type
        </Label>
        <Select value={draft.type} onValueChange={(v) => update("type", v === ANY ? "" : v)}>
          <SelectTrigger id="pf-type" className="w-full">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-min" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Min budget
          </Label>
          <Select value={draft.minPrice} onValueChange={(v) => update("minPrice", v === ANY ? "" : v)}>
            <SelectTrigger id="pf-min" className="w-full">
              <SelectValue placeholder="No min" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>No min</SelectItem>
              {minBudgetOptions.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-max" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Max budget
          </Label>
          <Select value={draft.maxPrice} onValueChange={(v) => update("maxPrice", v === ANY ? "" : v)}>
            <SelectTrigger id="pf-max" className="w-full">
              <SelectValue placeholder="No max" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>No max</SelectItem>
              {maxBudgetOptions.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* BHK */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bedrooms</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Bedroom configuration">
          {BHK_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={draft.bhk.includes(b)}
              onClick={() => toggleBhk(b)}
              className={cn(
                "inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-medium transition-all",
                draft.bhk.includes(b)
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {b === "4" ? "4+ BHK" : `${b} BHK`}
            </button>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bathrooms</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Bathrooms">
          {BATHROOM_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={draft.bathrooms === b}
              onClick={() => update("bathrooms", draft.bathrooms === b ? "" : b)}
              className={cn(
                "inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-medium transition-all",
                draft.bathrooms === b
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {b}+
            </button>
          ))}
        </div>
      </div>

      {/* Furnishing */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-furnishing" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Furnishing
        </Label>
        <Select value={draft.furnishing} onValueChange={(v) => update("furnishing", v === ANY ? "" : v)}>
          <SelectTrigger id="pf-furnishing" className="w-full">
            <SelectValue placeholder="Any furnishing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any furnishing</SelectItem>
            {FURNISHINGS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Construction status */}
      <div className="space-y-1.5">
        <Label
          htmlFor="pf-construction"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Construction status
        </Label>
        <Select
          value={draft.constructionStatus}
          onValueChange={(v) => update("constructionStatus", v === ANY ? "" : v)}
        >
          <SelectTrigger id="pf-construction" className="w-full">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            {CONSTRUCTION_STATUSES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verified only */}
      <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
        <Label htmlFor="pf-verified" className="text-sm font-normal text-foreground">
          Verified sellers only
        </Label>
        <Switch id="pf-verified" checked={draft.verified} onCheckedChange={(v) => update("verified", v)} />
      </div>

      <div className="flex gap-2.5 pt-1">
        <Button onClick={apply} className="flex-1">
          Apply filters
        </Button>
        <Button onClick={reset} variant="outline" className="flex-1">
          Reset
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Small building blocks
// ------------------------------------------------------------------

function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex gap-4 border-t pt-3.5">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Page numbers with ellipsis, capped around 7 visible entries. */
function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

function ResultsPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items = pageNumbers(page, totalPages);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon"
        className="size-10"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
      {items.map((item, i) =>
        typeof item === "number" ? (
          <Button
            key={item}
            variant={item === page ? "default" : "outline"}
            size="icon"
            className="size-10"
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPage(item)}
          >
            {item}
          </Button>
        ) : (
          <span
            key={`ellipsis-${i}`}
            className="grid size-10 place-items-center text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        className="size-10"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
      <span className="ml-2 text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
}

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

type LoadedResult =
  | { key: string; ok: true; data: PropertyCardDTO[]; pagination: Pagination }
  | { key: string; ok: false; message: string };

export function PropertiesView() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const query = route.query;

  // Current filter values — the URL is the single source of truth.
  const city = query.get("city") ?? "";
  const locality = query.get("locality") ?? "";
  const type = query.get("type") ?? "";
  const minPrice = query.get("minPrice") ?? "";
  const maxPrice = query.get("maxPrice") ?? "";
  const bhkList = useMemo(
    () =>
      (query.get("bhk") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [query]
  );
  const bathrooms = query.get("bathrooms") ?? "";
  const furnishing = query.get("furnishing") ?? "";
  const constructionStatus = query.get("constructionStatus") ?? "";
  const verified = query.get("verified") === "1";
  const q = query.get("q") ?? "";
  const sort = query.get("sort") ?? "recent";

  const [loaded, setLoaded] = useState<LoadedResult | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Remount key for the filter panels — draft state re-initialises from the
  // URL whenever the filter params change (chips, back/forward navigation).
  const panelKey = useMemo(
    () => FILTER_KEYS.map((k) => query.get(k) ?? "").join("|"),
    [query]
  );

  // Canonical search string — refetches whenever any driving param changes.
  const search = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const v = query.get(key);
      if (v) params.set(key, v);
    }
    if (sort !== "recent") params.set("sort", sort);
    params.set("page", String(Math.max(1, Number(query.get("page")) || 1)));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [query, sort]);

  const requestKey = `${search}#${reloadNonce}`;

  useEffect(() => {
    let cancelled = false;
    api<Paginated<PropertyCardDTO>>(`/api/properties?${search}`)
      .then((res) => {
        if (!cancelled) {
          setLoaded({ key: requestKey, ok: true, data: res.data, pagination: res.pagination });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load properties.";
        setLoaded({ key: requestKey, ok: false, message });
        toast.error("Could not load properties", { description: message });
      });
    return () => {
      cancelled = true;
    };
  }, [search, requestKey]);

  // Loading is derived — the cached payload belongs to a different request.
  const loading = loaded?.key !== requestKey;
  const current = !loading && loaded ? loaded : null;
  const result = current && current.ok ? current : null;
  const loadError = current && !current.ok ? current.message : null;

  /** Clone the current query, apply a patch (empty value removes), reset page, navigate. */
  const applyFilters = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(query.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      const qs = params.toString();
      navigate(`/properties${qs ? `?${qs}` : ""}`);
    },
    [navigate, query]
  );

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(query.toString());
      if (page <= 1) params.delete("page");
      else params.set("page", String(page));
      const qs = params.toString();
      navigate(`/properties${qs ? `?${qs}` : ""}`);
    },
    [navigate, query]
  );

  const activeFilters = useMemo(() => {
    const chips: Array<{ label: string; remove: () => void }> = [];
    if (city) chips.push({ label: `City: ${city}`, remove: () => applyFilters({ city: null }) });
    if (locality)
      chips.push({ label: `Locality: ${locality}`, remove: () => applyFilters({ locality: null }) });
    if (type) chips.push({ label: `Type: ${type}`, remove: () => applyFilters({ type: null }) });
    if (minPrice)
      chips.push({
        label: `Min ${formatPrice(Number(minPrice))}`,
        remove: () => applyFilters({ minPrice: null }),
      });
    if (maxPrice)
      chips.push({
        label: `Max ${formatPrice(Number(maxPrice))}`,
        remove: () => applyFilters({ maxPrice: null }),
      });
    for (const b of bhkList) {
      chips.push({
        label: `${b} BHK`,
        remove: () => applyFilters({ bhk: bhkList.filter((v) => v !== b).join(",") || null }),
      });
    }
    if (bathrooms)
      chips.push({
        label: `${bathrooms}+ bathrooms`,
        remove: () => applyFilters({ bathrooms: null }),
      });
    if (furnishing)
      chips.push({ label: furnishing, remove: () => applyFilters({ furnishing: null }) });
    if (constructionStatus) {
      const label =
        CONSTRUCTION_STATUSES.find((c) => c.value === constructionStatus)?.label ?? constructionStatus;
      chips.push({ label, remove: () => applyFilters({ constructionStatus: null }) });
    }
    if (verified) chips.push({ label: "Verified only", remove: () => applyFilters({ verified: null }) });
    if (q) chips.push({ label: `Search: "${q}"`, remove: () => applyFilters({ q: null }) });
    return chips;
  }, [
    city,
    locality,
    type,
    minPrice,
    maxPrice,
    bhkList,
    bathrooms,
    furnishing,
    constructionStatus,
    verified,
    q,
    applyFilters,
  ]);

  const clearAll = useCallback(() => {
    const patch: Record<string, string | null> = {};
    for (const key of FILTER_KEYS) patch[key] = null;
    applyFilters(patch);
  }, [applyFilters]);

  const total = result?.pagination.total ?? 0;
  const totalPages = result?.pagination.totalPages ?? 1;
  const page = result?.pagination.page ?? 1;
  const hasFilters = activeFilters.length > 0;

  const heading = result
    ? `${formatNumber(total)} ${total === 1 ? "home" : "homes"}${city ? ` in ${city}` : " across India"}`
    : "Homes for sale";

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-label="Search properties">
      {/* Top back navigation */}
      <div className="mb-4 flex items-center">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/");
            }
          }}
          className="group inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-95 sm:text-sm"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5 text-primary" aria-hidden="true" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {heading}
          </h1>
          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilters.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.remove}
                  className="group inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {chip.label}
                  <X
                    className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 inline-flex min-h-9 items-center text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-44 sm:w-52">
            <Select value={sort} onValueChange={(v) => applyFilters({ sort: v === "recent" ? null : v })}>
              <SelectTrigger className="w-full" aria-label="Sort results">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2 lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {hasFilters && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {activeFilters.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop: sticky filter sidebar + results */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="hidden self-start lg:sticky lg:top-20 lg:block lg:w-80">
          <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto gph-scroll">
            <h2 className="font-display text-lg font-semibold text-foreground">Filters</h2>
            <div className="mt-5">
              <FilterPanel key={panelKey} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : loadError ? (
            <EmptyState
              icon={<SearchX className="size-6" aria-hidden="true" />}
              title="Could not load properties"
              description={loadError}
              action={<Button onClick={() => setReloadNonce((n) => n + 1)}>Try again</Button>}
            />
          ) : result && result.data.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-6" aria-hidden="true" />}
              title="No properties match your search"
              description="Try removing a few filters, widening your budget, or exploring another city."
              action={hasFilters ? <Button onClick={clearAll}>Clear all filters</Button> : undefined}
            />
          ) : result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {result.data.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
              <ResultsPagination page={page} totalPages={totalPages} onPage={goToPage} />
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile filters */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader className="border-b text-left">
            <SheetTitle className="font-display">Filters</SheetTitle>
            <SheetDescription>Refine your search, then apply.</SheetDescription>
          </SheetHeader>
          <div className="p-4 sm:p-5">
            <FilterPanel key={panelKey} onApplied={() => setFiltersOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
