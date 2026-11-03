"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { PROJECT_STATUSES } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";
import type { Paginated, ProjectCardDTO } from "@/lib/types";
import { ProjectCard } from "../shared/project-card";
import { EmptyState } from "../shared/section";

const PAGE_SIZE = 9;
const ANY = "__any__";

const PROJECT_CITIES = ["Bengaluru", "Pune", "Hyderabad", "Noida"] as const;

type LoadedProjects =
  | { key: string; ok: true; items: ProjectCardDTO[]; total: number; pagesLoaded: number }
  | { key: string; ok: false; message: string };

function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-40" />
        <div className="flex gap-4 border-t pt-3.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
    </div>
  );
}

function cityChipClass(active: boolean) {
  return cn(
    "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-all",
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
  );
}

export function ProjectsView() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const query = route.query;

  const city = query.get("city") ?? "";
  const construction = query.get("construction") ?? "";

  const [loaded, setLoaded] = useState<LoadedProjects | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const requestKey = `${city}|${construction}|${reloadNonce}`;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: "1", pageSize: String(PAGE_SIZE) });
    if (city) params.set("city", city);
    if (construction) params.set("construction", construction);
    api<Paginated<ProjectCardDTO>>(`/api/projects?${params.toString()}`)
      .then((res) => {
        if (!cancelled) {
          setLoaded({
            key: requestKey,
            ok: true,
            items: res.data,
            total: res.pagination.total,
            pagesLoaded: 1,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load projects.";
        setLoaded({ key: requestKey, ok: false, message });
        toast.error("Could not load projects", { description: message });
      });
    return () => {
      cancelled = true;
    };
  }, [city, construction, requestKey]);

  // Loading is derived — the cached payload belongs to a different request.
  const loading = loaded?.key !== requestKey;
  const current = !loading && loaded ? loaded : null;
  const items = current && current.ok ? current.items : [];
  const total = current && current.ok ? current.total : 0;
  const loadError = current && !current.ok ? current.message : null;

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(query.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      navigate(`/projects${qs ? `?${qs}` : ""}`);
    },
    [navigate, query]
  );

  async function loadMore() {
    if (loadingMore || !current || !current.ok) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        page: String(current.pagesLoaded + 1),
        pageSize: String(PAGE_SIZE),
      });
      if (city) params.set("city", city);
      if (construction) params.set("construction", construction);
      const res = await api<Paginated<ProjectCardDTO>>(`/api/projects?${params.toString()}`);
      setLoaded((prev) =>
        prev && prev.key === requestKey && prev.ok
          ? {
              ...prev,
              items: [...prev.items, ...res.data],
              total: res.pagination.total,
              pagesLoaded: prev.pagesLoaded + 1,
            }
          : prev
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load more projects.");
    } finally {
      setLoadingMore(false);
    }
  }

  const hasFilters = Boolean(city || construction);
  const heading = current
    ? `${formatNumber(total)} ${total === 1 ? "project" : "projects"}${
        city ? ` in ${city}` : " across India"
      }`
    : "Residential projects";

  return (
    <>
      {/* Hero strip */}
      <section className="border-b bg-card/70" aria-label="Projects introduction">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">New projects</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Residential Projects by Trusted Developers
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Browse apartment complexes, villa enclaves and plotted townships listed by builders on
            Vasati. Pricing and unit availability are updated by the developers themselves — verify
            RERA registration and project documents before you book.
          </p>
        </div>
      </section>

      {/* Listing */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8" aria-label="Browse projects">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {heading}
          </h2>
          <div className="w-full sm:w-64">
            <Select
              value={construction || ANY}
              onValueChange={(v) => setParam("construction", v === ANY ? "" : v)}
            >
              <SelectTrigger className="w-full" aria-label="Filter by construction status">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All stages</SelectItem>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter projects by city">
          <button
            type="button"
            aria-pressed={!city}
            onClick={() => setParam("city", "")}
            className={cityChipClass(!city)}
          >
            All cities
          </button>
          {PROJECT_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={city === c}
              onClick={() => setParam("city", city === c ? "" : c)}
              className={cityChipClass(city === c)}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError && items.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<SearchX className="size-6" aria-hidden="true" />}
            title="Could not load projects"
            description={loadError}
            action={<Button onClick={() => setReloadNonce((n) => n + 1)}>Try again</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Building2 className="size-6" aria-hidden="true" />}
            title="No projects found"
            description={
              hasFilters
                ? "No published projects match the selected city or construction stage. Try a different combination."
                : "No projects have been published yet. Check back soon."
            }
            action={
              hasFilters ? (
                <Button onClick={() => navigate("/projects")}>Clear filters</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            {items.length < total && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Showing {items.length} of {formatNumber(total)} projects
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
