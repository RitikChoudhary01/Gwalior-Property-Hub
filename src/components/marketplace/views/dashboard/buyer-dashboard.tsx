"use client";

// ============================================================
// BuyerDashboard — role dashboard for BUYER accounts.
// Tabs: overview / favourites / requirements / enquiries /
// visits / profile.
// Mobile: horizontal scrollable tab bar. Desktop: left sidebar.
// The active tab syncs to the URL (?tab=…) with replace.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquareText,
  Phone,
  PlusCircle,
  Search,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { REQUIREMENT_PURPOSES } from "@/lib/constants";
import {
  formatConfig,
  formatDate,
  formatMonthYear,
  formatNumber,
  formatPrice,
  formatPriceRange,
  initials,
} from "@/lib/format";
import type {
  BuyerStats,
  LeadDTO,
  Paginated,
  PropertyCardDTO,
  RequirementDTO,
  RequirementMatchDTO,
  SiteVisitDTO,
} from "@/lib/types";
import { EmptyState, SectionHeading, StatCard } from "../../shared/section";
import { StatusBadge } from "../../shared/status-badge";
import { PropertyCard } from "../../shared/property-card";
import {
  RequirementForm,
  RequirementMatchesList,
  type RequirementPostResult,
} from "../../shared/requirement-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ---------- tabs ----------

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "favourites", label: "Favourites", icon: Heart },
  { id: "requirements", label: "My requirements", icon: ClipboardList },
  { id: "enquiries", label: "Enquiries", icon: MessageSquareText },
  { id: "visits", label: "Site visits", icon: CalendarDays },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

type TabId = (typeof TABS)[number]["id"];
const VALID_TABS: readonly string[] = TABS.map((t) => t.id);

// ---------- data hook (local to this view) ----------

function useApiData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  // Fetches on mount and on manual refetch. All state updates happen in
  // async callbacks — previously loaded data stays visible during a refresh.
  useEffect(() => {
    let cancelled = false;
    api<T>(path)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  return { data, loading, error, refetch };
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<XCircle className="size-6" aria-hidden="true" />}
      title="Could not load this section"
      description={message}
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}

// ============================================================
// Overview tab
// ============================================================

function OverviewTab() {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<BuyerStats>("/api/stats");

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error || !data) return <ErrorState message={error ?? "Please try again."} onRetry={refetch} />;

  const quickLinks = [
    { label: "Browse properties", icon: Search, onClick: () => navigate("/properties") },
    { label: "My favourites", icon: Heart, onClick: () => navigate("/dashboard?tab=favourites") },
    { label: "My enquiries", icon: MessageSquareText, onClick: () => navigate("/dashboard?tab=enquiries") },
    { label: "My site visits", icon: CalendarDays, onClick: () => navigate("/dashboard?tab=visits") },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Favourites"
          value={formatNumber(data.favourites)}
          sub="Homes you have saved"
          icon={<Heart className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Enquiries raised"
          value={formatNumber(data.enquiries)}
          sub="Across all properties"
          icon={<MessageSquareText className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Upcoming visits"
          value={formatNumber(data.upcomingVisits)}
          sub="Requested, confirmed or rescheduled"
          icon={<CalendarDays className="size-5" aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((l) => (
          <button
            key={l.label}
            type="button"
            onClick={l.onClick}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="flex min-w-0 items-center gap-3">
              <l.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate text-sm font-medium text-foreground">{l.label}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>

      <section>
        <SectionHeading
          eyebrow="Trending now"
          title="Homes buyers are viewing"
          description="The most viewed properties on Vasati right now."
          linkText="Explore all"
          linkHref="#/properties"
        />
        {data.recentProperties.length === 0 ? (
          <EmptyState
            title="Nothing to show yet"
            description="Published homes will appear here as buyers start exploring."
            className="mt-6"
          />
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.recentProperties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// Favourites tab
// ============================================================

function FavouritesTab() {
  const navigate = useAppStore((s) => s.navigate);
  const favourites = useAppStore((s) => s.favourites);
  const { data, loading, error, refetch } = useApiData<{ data: PropertyCardDTO[] }>(
    "/api/favourites/properties"
  );

  // The card heart toggles the store instantly — mirror it here so
  // removed favourites disappear from the grid without a refetch.
  const shown = useMemo(
    () => (data?.data ?? []).filter((p) => favourites.includes(p.id)),
    [data, favourites]
  );

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (shown.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-6" aria-hidden="true" />}
        title="No favourites yet"
        description="Tap the heart on any listing to save it here and compare later."
        action={<Button onClick={() => navigate("/properties")}>Browse properties</Button>}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}

// ============================================================
// Requirements tab (buyer's posted requirements + live matches)
// ============================================================

type RequirementListItem = RequirementDTO & { matchCount: number; topMatch: string | null };

interface RequirementsListResponse {
  items: RequirementListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Live matches for one requirement — loaded on expand from the detail endpoint. */
function RequirementMatches({ requirementId }: { requirementId: string }) {
  const { data, loading, error, refetch } = useApiData<{
    requirement: RequirementDTO;
    matches: RequirementMatchDTO[];
  }>(`/api/requirements/${requirementId}`);

  if (loading) {
    return (
      <div className="space-y-3.5">
        <Skeleton className="h-5 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) return <ErrorState message={error ?? "Please try again."} onRetry={refetch} />;

  return <RequirementMatchesList matches={data.matches} />;
}

function RequirementsTab() {
  const [postOpen, setPostOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useApiData<RequirementsListResponse>(
    "/api/requirements?pageSize=50"
  );

  const items = data?.items ?? [];

  function handlePosted(res: RequirementPostResult) {
    refetch();
    setExpandedId(res.requirement.id); // reveal the new requirement with its matches
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">My requirements</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tell us what you&rsquo;re looking for — we source homes on and off the market and call you
            with matches.
          </p>
        </div>
        <Button type="button" onClick={() => setPostOpen(true)}>
          <PlusCircle className="size-4" aria-hidden="true" />
          Post a requirement
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" aria-hidden="true" />}
          title="You haven't posted a requirement yet"
          description="Can't find the right home? Post what you need — we'll search approved inventory on and off the market and call you with matches."
          action={
            <Button type="button" onClick={() => setPostOpen(true)}>
              Post a requirement
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((r) => {
            const expanded = expandedId === r.id;
            const purposeLabel =
              REQUIREMENT_PURPOSES.find((p) => p.value === r.purpose)?.label ?? r.purpose;
            const config =
              r.propertyType === "Any" && !r.bhk ? "Any home" : formatConfig(r.bhk, r.propertyType);
            return (
              <article key={r.id} className="rounded-xl border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  aria-expanded={expanded}
                  aria-controls={`${r.id}-matches`}
                  className="w-full rounded-xl p-4 text-left sm:p-5"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-medium text-foreground">{r.reference}</span>
                        <StatusBadge status={r.status} />
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                        {purposeLabel} · {config} · {r.city}
                        {r.localities.length > 0 && ` — ${r.localities.join(", ")}`}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                        expanded && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-[13px] text-muted-foreground">
                    <span>
                      Budget:{" "}
                      <span className="font-medium text-foreground">
                        {formatPriceRange(r.budgetMin, r.budgetMax)}
                      </span>
                    </span>
                    {r.matchCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                        <Sparkles className="size-4" aria-hidden="true" />
                        {r.matchCount} {r.matchCount === 1 ? "match" : "matches"}
                      </span>
                    ) : (
                      <span>Advisor sourcing options</span>
                    )}
                    <span className="sm:ml-auto">Posted {formatDate(r.createdAt)}</span>
                  </span>
                  {r.matchCount > 0 && r.topMatch && (
                    <span className="mt-1.5 block truncate text-[13px] text-muted-foreground">
                      Top match: <span className="font-medium text-foreground">{r.topMatch}</span>
                    </span>
                  )}
                </button>

                {expanded && (
                  <div id={`${r.id}-matches`} className="px-4 pb-5 sm:px-5">
                    {r.notes && (
                      <p className="mb-4 rounded-lg bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    )}
                    <RequirementMatches requirementId={r.id} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Post a requirement</DialogTitle>
            <DialogDescription>
              Tell us what you&rsquo;re looking for — we&rsquo;ll match it against approved inventory and
              an advisor will call you within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <RequirementForm idPrefix="dash-req" onPosted={handlePosted} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Enquiries tab (buyer's own enquiries)
// ============================================================

function EnquiriesTab() {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<Paginated<LeadDTO>>("/api/leads?pageSize=50");
  const leads = data?.data ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquareText className="size-6" aria-hidden="true" />}
        title="No enquiries yet"
        description="When you contact a listing owner, your enquiry and its status will show up here."
        action={<Button onClick={() => navigate("/properties")}>Browse properties</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <article key={lead.id} className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/properties/${lead.property.slug}`)}
              className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
              aria-label={`Open ${lead.property.title}`}
            >
              {lead.property.mainImage ? (
                <img
                  src={lead.property.mainImage}
                  alt={lead.property.title}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center text-muted-foreground">
                  <Search className="size-5" aria-hidden="true" />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/properties/${lead.property.slug}`)}
                  className="truncate text-left text-[15px] font-medium text-foreground hover:text-primary"
                >
                  {lead.property.title}
                </button>
                <StatusBadge status={lead.status} />
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ref {lead.reference} · {lead.property.locality}, {lead.property.city} ·{" "}
                {formatPrice(lead.property.price)}
              </p>
              {lead.message && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {lead.message}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3.5 text-[13px] text-muted-foreground">
            {lead.budget != null && (
              <span>
                Budget: <span className="font-medium text-foreground">{formatPrice(lead.budget)}</span>
              </span>
            )}
            <span className="sm:ml-auto">Submitted {formatDate(lead.createdAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

// ============================================================
// Visits tab (buyer's own site visits)
// ============================================================

const ACTIVE_VISIT_STATUSES = ["REQUESTED", "CONFIRMED", "RESCHEDULED"];

function VisitsTab() {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<Paginated<SiteVisitDTO>>(
    "/api/site-visits?pageSize=50"
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmVisit, setConfirmVisit] = useState<SiteVisitDTO | null>(null);

  const visits = data?.data ?? [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isUpcoming = (v: SiteVisitDTO) =>
    ACTIVE_VISIT_STATUSES.includes(v.status) && new Date(v.preferredDate) >= todayStart;
  const upcoming = visits.filter(isUpcoming);
  const past = visits.filter((v) => !isUpcoming(v));

  async function cancelVisit(visit: SiteVisitDTO) {
    setBusyId(visit.id);
    try {
      await api(`/api/site-visits/${visit.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      toast.success("Visit request cancelled", { description: visit.property.title });
      setConfirmVisit(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel the visit. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (visits.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-6" aria-hidden="true" />}
        title="No site visits yet"
        description="Found a home you like? Request a guided visit from the listing page and track it here."
        action={<Button onClick={() => navigate("/properties")}>Browse properties</Button>}
      />
    );
  }

  function VisitCard({ visit }: { visit: SiteVisitDTO }) {
    const cancellable = ACTIVE_VISIT_STATUSES.includes(visit.status) && isUpcoming(visit);
    return (
      <article className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-medium text-foreground">{visit.property.title}</h3>
              <StatusBadge status={visit.status} />
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {visit.property.locality}, {visit.property.city}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/properties/${visit.property.slug}`)}
          >
            View listing
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3.5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatDate(visit.preferredDate)}
          </span>
          <span>{visit.preferredTime}</span>
          {cancellable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              disabled={busyId === visit.id}
              onClick={() => setConfirmVisit(visit)}
            >
              {busyId === visit.id && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Cancel request
            </Button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="upcoming-visits-heading">
        <h2 id="upcoming-visits-heading" className="font-display text-lg font-semibold text-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No upcoming visits. Request one from any listing page.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {upcoming.map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-visits-heading">
          <h2 id="past-visits-heading" className="font-display text-lg font-semibold text-foreground">
            Past
          </h2>
          <div className="mt-4 space-y-4">
            {past.map((v) => (
              <VisitCard key={v.id} visit={v} />
            ))}
          </div>
        </section>
      )}

      <AlertDialog open={!!confirmVisit} onOpenChange={(o) => !o && setConfirmVisit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this visit request?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmVisit &&
                `Your visit to "${confirmVisit.property.title}" on ${formatDate(
                  confirmVisit.preferredDate
                )} at ${confirmVisit.preferredTime} will be cancelled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Keep visit</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId !== null}
              onClick={(e) => {
                e.preventDefault();
                if (confirmVisit) void cancelVisit(confirmVisit);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busyId !== null && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Cancel visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Profile tab
// ============================================================

function ProfileTab() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      toast.success("Signed out", { description: "See you soon." });
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary/10 font-display text-xl font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{user.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Buyer account</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Mail className="size-3.5" aria-hidden="true" /> Email
            </dt>
            <dd className="mt-1.5 truncate text-sm font-medium text-foreground">{user.email}</dd>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Phone className="size-3.5" aria-hidden="true" /> Phone
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">{user.phone ?? "Not provided"}</dd>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <CalendarDays className="size-3.5" aria-hidden="true" /> Member since
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">
              {formatMonthYear(user.createdAt)}
            </dd>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <UserRound className="size-3.5" aria-hidden="true" /> Account type
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">Buyer</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Account settings</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          For security, profile details are managed by our team. To change your email address or delete
          your account, contact support at{" "}
          <a href="mailto:support@vasati.in" className="font-medium text-primary hover:underline">
            support@vasati.in
          </a>
          .
        </p>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          Sign out
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// BuyerDashboard shell
// ============================================================

export function BuyerDashboard({ initialTab }: { initialTab?: string }) {
  const user = useAppStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);

  // The URL is the single source of truth for the active tab. The
  // initialTab prop seeds the first render (it comes from the same ?tab=
  // query parameter, so the two always agree).
  const tabParam = route.query.get("tab") ?? initialTab;
  const activeTab: TabId =
    tabParam && VALID_TABS.includes(tabParam) ? (tabParam as TabId) : "overview";

  function selectTab(tab: TabId) {
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Buyer dashboard</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track your saved homes, requirements, enquiries and site visits in one place.
        </p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* Mobile: horizontal scrollable tab bar */}
        <nav
          aria-label="Dashboard sections"
          className="vasati-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop: left sidebar */}
        <nav aria-label="Dashboard sections" className="hidden lg:block">
          <div className="flex w-56 flex-col gap-1 rounded-xl border bg-card p-2 shadow-sm">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-6 min-w-0 lg:mt-0">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "favourites" && <FavouritesTab />}
          {activeTab === "requirements" && <RequirementsTab />}
          {activeTab === "enquiries" && <EnquiriesTab />}
          {activeTab === "visits" && <VisitsTab />}
          {activeTab === "profile" && <ProfileTab />}
        </div>
      </div>
    </section>
  );
}
