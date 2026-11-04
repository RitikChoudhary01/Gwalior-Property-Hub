"use client";

// ============================================================
// SellerDashboard — role dashboard for SELLER accounts.
// Tabs: overview / listings / enquiries / visits / commissions /
// profile. Mobile: horizontal scrollable tab bar. Desktop: left
// sidebar. The active tab syncs to the URL (?tab=…) with replace.
// Listing create/edit happens in a Dialog hosting PropertyForm.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CirclePause,
  Eye,
  Hourglass,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  SendHorizontal,
  ShieldAlert,
  Trash2,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate, formatMonthYear, formatNumber, formatPrice, initials } from "@/lib/format";
import { VISIT_TIME_SLOTS } from "@/lib/constants";
import type {
  LeadDTO,
  Paginated,
  PropertyCardDTO,
  PropertyDetailDTO,
  SellerStats,
  SiteVisitDTO,
} from "@/lib/types";
import { EmptyState, StatCard } from "../../shared/section";
import { StatusBadge, VerifiedBadge } from "../../shared/status-badge";
import { PropertyForm } from "./property-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CommissionsTab } from "./commissions-tab";

// ---------- tabs ----------

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "listings", label: "Listings", icon: Building2 },
  { id: "enquiries", label: "Enquiries", icon: MessageSquareText },
  { id: "visits", label: "Site visits", icon: CalendarDays },
  { id: "commissions", label: "Commissions", icon: Wallet },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

type TabId = (typeof TABS)[number]["id"];
const VALID_TABS: readonly string[] = TABS.map((t) => t.id);

// ---------- data hook (local to this view) ----------

function useApiData<T>(path: string, refreshKey = 0) {
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
  }, [path, reloadKey, refreshKey]);

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

function OverviewTab({
  refreshKey,
  onAddProperty,
}: {
  refreshKey: number;
  onAddProperty: () => void;
}) {
  const user = useAppStore((s) => s.user);
  const { data, loading, error, refetch } = useApiData<SellerStats>("/api/stats", refreshKey);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (error || !data) return <ErrorState message={error ?? "Please try again."} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {!user?.isVerified && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <ShieldAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Identity verification pending</AlertTitle>
          <AlertDescription className="text-amber-800">
            Our team reviews new sellers. Listings still go live after content approval — you can add
            and submit properties in the meantime.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total listings"
          value={formatNumber(data.totalProperties)}
          sub="All statuses"
          icon={<Building2 className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Published"
          value={formatNumber(data.published)}
          sub="Live on Gwalior Property Hub"
          icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Pending approval"
          value={formatNumber(data.pending)}
          sub="Awaiting review"
          icon={<Hourglass className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Total views"
          value={formatNumber(data.totalViews)}
          sub="Across all listings"
          icon={<Eye className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Enquiries"
          value={formatNumber(data.totalEnquiries)}
          sub="From interested buyers"
          icon={<MessageSquareText className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Upcoming visits"
          value={formatNumber(data.upcomingVisits)}
          sub="Requested, confirmed or rescheduled"
          icon={<CalendarDays className="size-5" aria-hidden="true" />}
        />
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Ready to list a property?
          </h3>
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Add a home with clear photos and honest details — it goes live after a quick content
            review by our team.
          </p>
        </div>
        <Button type="button" onClick={onAddProperty} className="shrink-0">
          <Plus className="size-4" aria-hidden="true" />
          Add new property
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Listings tab
// ============================================================

type ConfirmAction = { kind: "sold" | "delete"; property: PropertyCardDTO };

function ListingsTab({
  refreshKey,
  onAddProperty,
  onEditProperty,
}: {
  refreshKey: number;
  onAddProperty: () => void;
  onEditProperty: (property: PropertyDetailDTO) => void;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<Paginated<PropertyCardDTO>>(
    "/api/properties?scope=mine&pageSize=24",
    refreshKey
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const reasonFetchAttempted = useRef<Set<string>>(new Set());

  const listings = data?.data ?? [];

  // Fetch the rejection reason for rejected listings (list DTO omits it).
  useEffect(() => {
    const rejected = listings.filter(
      (p) => p.status === "REJECTED" && !reasonFetchAttempted.current.has(p.id)
    );
    if (rejected.length === 0) return;
    rejected.forEach((p) => reasonFetchAttempted.current.add(p.id));
    let cancelled = false;
    const run = async () => {
      const updates: Record<string, string> = {};
      for (const p of rejected) {
        try {
          const detail = await api<PropertyDetailDTO>(`/api/properties/${p.id}`);
          if (detail.rejectionReason) updates[p.id] = detail.rejectionReason;
        } catch {
          // ignore — the reason simply stays hidden
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setRejectionReasons((prev) => ({ ...prev, ...updates }));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [listings]);

  async function patchProperty(
    p: PropertyCardDTO,
    body: Record<string, unknown>
  ): Promise<PropertyDetailDTO | null> {
    setBusyId(p.id);
    try {
      const res = await api<{ property: PropertyDetailDTO }>(`/api/properties/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      refetch();
      return res.property;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the listing. Please try again.");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateListing(p: PropertyCardDTO) {
    const updated = await patchProperty(p, { status: "INACTIVE" });
    if (!updated) return;
    if (updated.status === "INACTIVE") {
      toast.success("Listing deactivated", { description: `${p.title} is now hidden from buyers.` });
    } else {
      // Defensive honesty: the API accepted the request but the status did
      // not change — surface that instead of a false success.
      toast.error("Could not deactivate this listing. Please try again or contact support.");
    }
  }

  async function submitForApproval(p: PropertyCardDTO) {
    const updated = await patchProperty(p, { status: "PENDING" });
    if (!updated) return;
    toast.success("Listing submitted for approval", {
      description: "Our team reviews new listings, usually within 24 hours.",
    });
  }

  async function markAsSold(p: PropertyCardDTO) {
    const updated = await patchProperty(p, { availability: "SOLD" });
    if (!updated) return;
    if (updated.availability === "SOLD" || updated.status === "SOLD") {
      toast.success("Marked as sold", { description: p.title });
    } else {
      toast.error("Could not mark this listing as sold. Please try again.");
    }
    setConfirm(null);
  }

  async function deleteProperty(p: PropertyCardDTO) {
    setBusyId(p.id);
    try {
      await api(`/api/properties/${p.id}`, { method: "DELETE" });
      toast.success("Listing deleted", { description: p.title });
      setConfirm(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the listing. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function startEdit(p: PropertyCardDTO) {
    setEditLoadingId(p.id);
    try {
      const detail = await api<PropertyDetailDTO>(`/api/properties/${p.id}`);
      onEditProperty(detail);
    } catch {
      toast.error("Could not load this listing for editing. Please try again.");
    } finally {
      setEditLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="size-6" aria-hidden="true" />}
        title="No listings yet"
        description="List your first property — it takes about five minutes and our team reviews it within 24 hours."
        action={
          <Button type="button" onClick={onAddProperty}>
            <Plus className="size-4" aria-hidden="true" />
            List your first property
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Your listings
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {listings.length} listing{listings.length === 1 ? "" : "s"} · drafts and pending reviews
            included
          </p>
        </div>
        <Button type="button" onClick={onAddProperty}>
          <Plus className="size-4" aria-hidden="true" />
          Add property
        </Button>
      </div>

      {listings.map((p) => {
        const resubmittable = p.status === "DRAFT" || p.status === "REJECTED" || p.status === "INACTIVE";
        return (
          <article
            key={p.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-lg sm:p-5",
              busyId === p.id && "opacity-60"
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-40">
                {p.mainImage ? (
                  <img
                    src={p.mainImage}
                    alt={p.title}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-muted-foreground">
                    <MapPin className="size-6" aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-medium text-foreground">{p.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {p.locality}, {p.city}
                      </span>
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${p.title}`}
                        disabled={busyId === p.id}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => void startEdit(p)}>
                        {editLoadingId === p.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Pencil className="size-4" aria-hidden="true" />
                        )}
                        {editLoadingId === p.id ? "Loading…" : "Edit"}
                      </DropdownMenuItem>
                      {p.status === "PUBLISHED" && (
                        <DropdownMenuItem onClick={() => navigate(`/properties/${p.slug}`)}>
                          <Eye className="size-4" aria-hidden="true" />
                          View public page
                        </DropdownMenuItem>
                      )}
                      {(p.status === "PUBLISHED" || p.status === "INACTIVE") && p.availability !== "SOLD" && (
                        <DropdownMenuItem onClick={() => setConfirm({ kind: "sold", property: p })}>
                          <BadgeCheck className="size-4" aria-hidden="true" />
                          Mark as sold
                        </DropdownMenuItem>
                      )}
                      {p.status === "PUBLISHED" ? (
                        <DropdownMenuItem onClick={() => void deactivateListing(p)}>
                          <CirclePause className="size-4" aria-hidden="true" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : resubmittable ? (
                        <DropdownMenuItem onClick={() => void submitForApproval(p)}>
                          <SendHorizontal className="size-4" aria-hidden="true" />
                          {p.status === "DRAFT" ? "Submit for approval" : "Resubmit for approval"}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setConfirm({ kind: "delete", property: p })}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete listing
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {formatPrice(p.price)}
                  </span>
                  <StatusBadge status={p.status} />
                  {p.availability !== "AVAILABLE" && <StatusBadge status={p.availability} />}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="size-4" aria-hidden="true" />
                    {formatNumber(p.views)} views
                  </span>
                  <span>Added {formatDate(p.createdAt)}</span>
                </div>

                {p.status === "REJECTED" && (
                  <div className="mt-3.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-rose-950">Action required — rejection feedback:</span>{" "}
                        {rejectionReasons[p.id] || "Your listing needs updates before it can be approved and published."}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1.5 shrink-0 shadow-sm"
                        disabled={editLoadingId === p.id}
                        onClick={() => void startEdit(p)}
                      >
                        {editLoadingId === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Pencil className="size-3.5" aria-hidden="true" />
                        )}
                        Edit & Resubmit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          {confirm?.kind === "sold" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark this listing as sold?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{confirm.property.title}” will be marked as sold and removed from search results.
                  You can still see it under your listings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busyId !== null}>Not yet</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busyId !== null}
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    void markAsSold(confirm.property);
                  }}
                >
                  {busyId !== null && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Mark as sold
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{confirm?.property.title}” and its photos, enquiries and visit requests will be
                  permanently removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busyId !== null}>Keep listing</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busyId !== null}
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm) void deleteProperty(confirm.property);
                  }}
                >
                  {busyId !== null && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Delete listing
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Enquiries tab (leads on the seller's own listings)
// ============================================================

function EnquiriesTab() {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<Paginated<LeadDTO>>("/api/leads?pageSize=50");
  const [busyId, setBusyId] = useState<string | null>(null);
  const leads = data?.data ?? [];

  async function updateLead(
    lead: LeadDTO,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    setBusyId(lead.id);
    try {
      await api(`/api/leads/${lead.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success(successMessage, { description: `${lead.name} · ${lead.reference}` });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the enquiry. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
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
        description="When buyers contact you about a listing, their details appear here so you can follow up quickly."
      />
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <article
          key={lead.id}
          className={cn(
            "rounded-xl border bg-card p-4 shadow-sm sm:p-5",
            busyId === lead.id && "opacity-60"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold text-foreground">{lead.name}</h3>
              <StatusBadge status={lead.status} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Ref {lead.reference}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {lead.phone}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
              >
                <Mail className="size-3.5" aria-hidden="true" />
                {lead.email}
              </a>
            )}
          </div>

          <div className="mt-4 flex gap-3 rounded-lg border bg-background p-3">
            <button
              type="button"
              onClick={() => navigate(`/properties/${lead.property.slug}`)}
              className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted"
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
                  <Search className="size-4" aria-hidden="true" />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate(`/properties/${lead.property.slug}`)}
                className="block max-w-full truncate text-left text-sm font-medium text-foreground hover:text-primary"
              >
                {lead.property.title}
              </button>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {lead.property.locality}, {lead.property.city} · {formatPrice(lead.property.price)}
              </p>
              {lead.message && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                  {lead.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3.5">
            <span className="text-[13px] text-muted-foreground">
              {lead.budget != null && (
                <>
                  Budget <span className="font-medium text-foreground">{formatPrice(lead.budget)}</span>
                  {" · "}
                </>
              )}
              Received {formatDate(lead.createdAt)}
            </span>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === lead.id}
                onClick={() =>
                  void updateLead(
                    lead,
                    { status: "CONTACTED", markContacted: true },
                    "Marked as contacted"
                  )
                }
              >
                {busyId === lead.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Phone className="size-4" aria-hidden="true" />
                )}
                Mark contacted
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={busyId === lead.id}
                onClick={() => void updateLead(lead, { status: "LOST" }, "Marked as lost")}
              >
                Mark lost
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ============================================================
// Visits tab (visits on the seller's own listings)
// ============================================================

function VisitsTab() {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<Paginated<SiteVisitDTO>>(
    "/api/site-visits?pageSize=50"
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const [reschedule, setReschedule] = useState<SiteVisitDTO | null>(null);
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const [resError, setResError] = useState<string | null>(null);

  const visits = data?.data ?? [];

  async function patchVisit(
    visit: SiteVisitDTO,
    body: Record<string, unknown>,
    successMessage: string
  ): Promise<boolean> {
    setBusyId(visit.id);
    try {
      await api(`/api/site-visits/${visit.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success(successMessage, { description: visit.property.title });
      refetch();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the visit. Please try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function openReschedule(visit: SiteVisitDTO) {
    setReschedule(visit);
    setResDate(visit.preferredDate.slice(0, 10));
    setResTime(visit.preferredTime);
    setResError(null);
  }

  async function submitReschedule() {
    if (!reschedule) return;
    if (resDate === "") {
      setResError("Pick a new date for the visit.");
      return;
    }
    if (resTime === "") {
      setResError("Pick a time slot.");
      return;
    }
    const d = new Date(`${resDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(d.getTime()) || d < today) {
      setResError("The new date must be today or later.");
      return;
    }
    setResError(null);
    const success = await patchVisit(
      reschedule,
      { status: "RESCHEDULED", preferredDate: resDate, preferredTime: resTime },
      "Visit rescheduled — the buyer will be notified"
    );
    if (success) setReschedule(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
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
        description="When buyers request a visit to one of your listings, it appears here for you to confirm, reschedule or decline."
      />
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit) => {
        const canConfirm = visit.status === "REQUESTED" || visit.status === "RESCHEDULED";
        const canComplete = visit.status === "CONFIRMED";
        return (
          <article
            key={visit.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm sm:p-5",
              busyId === visit.id && "opacity-60"
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/properties/${visit.property.slug}`)}
                  className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted"
                  aria-label={`Open ${visit.property.title}`}
                >
                  {visit.property.mainImage ? (
                    <img
                      src={visit.property.mainImage}
                      alt={visit.property.title}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-muted-foreground">
                      <MapPin className="size-5" aria-hidden="true" />
                    </span>
                  )}
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/properties/${visit.property.slug}`)}
                      className="truncate text-left text-[15px] font-medium text-foreground hover:text-primary"
                    >
                      {visit.property.title}
                    </button>
                    <StatusBadge status={visit.status} />
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {visit.property.locality}, {visit.property.city}
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {visit.contactName} ·{" "}
                    <a
                      href={`tel:${visit.contactPhone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {visit.contactPhone}
                    </a>
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {formatDate(visit.preferredDate)}
                    </span>
                    <span>{visit.preferredTime}</span>
                  </p>
                </div>
              </div>

              {(canConfirm || canComplete) && (
                <div className="flex flex-wrap gap-2 sm:w-44 sm:flex-col">
                  {busyId === visit.id ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Updating…
                    </span>
                  ) : canConfirm ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          void patchVisit(visit, { status: "CONFIRMED" }, "Visit confirmed")
                        }
                      >
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openReschedule(visit)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          void patchVisit(visit, { status: "CANCELLED" }, "Visit declined")
                        }
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          void patchVisit(visit, { status: "COMPLETED" }, "Visit marked completed")
                        }
                      >
                        Mark completed
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          void patchVisit(visit, { status: "CANCELLED" }, "Visit cancelled")
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}

      {/* Reschedule dialog */}
      <Dialog open={!!reschedule} onOpenChange={(o) => !o && setReschedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule site visit</DialogTitle>
            <DialogDescription>
              {reschedule &&
                `Pick a new date and time for ${reschedule.contactName}'s visit to “${reschedule.property.title}”. They will be notified.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={resDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setResDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reschedule-time">Time slot</Label>
              <Select value={resTime} onValueChange={(v) => setResTime(v)}>
                <SelectTrigger id="reschedule-time" className="w-full">
                  <SelectValue placeholder="Select a time" />
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
            {resError && <p className="text-xs font-medium text-destructive">{resError}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setReschedule(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReschedule()}>
              Reschedule visit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Profile tab
// ============================================================

const LISTER_TIPS = [
  {
    title: "Photograph in daylight",
    text: "Bright, honest photos of every room earn far more enquiries than a single dark exterior shot.",
  },
  {
    title: "Price it right",
    text: "Compare similar homes in your locality before setting the price — overpriced listings sit unused.",
  },
  {
    title: "Reply within a day",
    text: "Buyers move on quickly. A prompt, courteous reply is the strongest trust signal you can send.",
  },
  {
    title: "Keep details current",
    text: "Update availability when things change and mark your home sold promptly once the deal closes.",
  },
  {
    title: "Be transparent",
    text: "Disclose maintenance dues, repairs or society rules upfront — surprises derail deals late.",
  },
];

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/10 font-display text-xl font-semibold text-primary">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {user.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Property owner account</p>
            </div>
          </div>
          <VerifiedBadge verified={user.isVerified} label={user.isVerified ? "Verified seller" : "Verification pending"} />
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
            <dd className="mt-1.5 text-sm font-medium text-foreground">{formatMonthYear(user.createdAt)}</dd>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <UserRound className="size-3.5" aria-hidden="true" /> Account type
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">Property owner (seller)</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" aria-hidden="true" />
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Lister best practices
          </h3>
        </div>
        <ul className="mt-4 space-y-3.5">
          {LISTER_TIPS.map((tip) => (
            <li key={tip.title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">{tip.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{tip.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Account settings</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          For security, profile details are managed by our team. To change your email address or
          delete your account, contact support at{" "}
          <a href="mailto:support@gwaliorpropertyhub.in" className="font-medium text-primary hover:underline">
            support@gwaliorpropertyhub.in
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
// SellerDashboard shell
// ============================================================

export function SellerDashboard({ initialTab }: { initialTab?: string }) {
  const user = useAppStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);

  // The URL is the single source of truth for the active tab. The
  // initialTab prop seeds the first render (it comes from the same ?tab=
  // query parameter, so the two always agree).
  const tabParam = route.query.get("tab") ?? initialTab;
  const activeTab: TabId =
    tabParam && VALID_TABS.includes(tabParam) ? (tabParam as TabId) : "overview";

  // Listing form dialog (create + edit) lives at the shell level so the
  // overview CTA and the listings tab can both open it.
  const [formOpen, setFormOpen] = useState(false);
  const [formProperty, setFormProperty] = useState<PropertyDetailDTO | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  function selectTab(tab: TabId) {
    navigate(`/dashboard?tab=${tab}`, { replace: true });
  }

  function openCreateForm() {
    setFormProperty(null);
    setFormOpen(true);
  }

  function openEditForm(property: PropertyDetailDTO) {
    setFormProperty(property);
    setFormOpen(true);
  }

  function handleAddNewFromOverview() {
    selectTab("listings");
    openCreateForm();
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Seller dashboard
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage your listings, buyer enquiries and site visits in one place.
        </p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* Mobile: horizontal scrollable tab bar */}
        <nav
          aria-label="Dashboard sections"
          className="gph-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
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
          {activeTab === "overview" && (
            <OverviewTab refreshKey={savedAt} onAddProperty={handleAddNewFromOverview} />
          )}
          {activeTab === "listings" && (
            <ListingsTab
              refreshKey={savedAt}
              onAddProperty={openCreateForm}
              onEditProperty={openEditForm}
            />
          )}
          {activeTab === "enquiries" && <EnquiriesTab />}
          {activeTab === "visits" && <VisitsTab />}
          {activeTab === "commissions" && <CommissionsTab partyLabel="Property Owner" />}
          {activeTab === "profile" && <ProfileTab />}
        </div>
      </div>

      {/* Create / edit listing dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-3xl">
          <PropertyForm
            key={formProperty?.id ?? "new"}
            property={formProperty}
            onSaved={() => setSavedAt(Date.now())}
            onClose={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
