"use client";

// ============================================================
// Buyer requirements CRM — internal views for requirement briefs
// posted through the public "Post Your Requirement" form.
// AdminRequirements: filterable pipeline table with assignment
// and status management. RequirementDetailDialog: the full buyer
// brief plus live matched inventory (the same matching engine
// buyers see); it is reused by the team dashboard with
// canAssign={false} since only administrators can assign.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Check,
  ExternalLink,
  Eye,
  Home,
  Inbox,
  Mail,
  MoreHorizontal,
  Phone,
  ShieldCheck,
  Target,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { CITIES, REQUIREMENT_PURPOSES, REQUIREMENT_STATUSES } from "@/lib/constants";
import {
  formatArea,
  formatConfig,
  formatDate,
  formatDateTime,
  formatPrice,
  formatPriceRange,
} from "@/lib/format";
import type { Pagination, RequirementDTO, RequirementMatchDTO } from "@/lib/types";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "../../../shared/section";
import { StatusBadge } from "../../../shared/status-badge";
import {
  AdminCard,
  AvatarInitials,
  ChipBar,
  LoadError,
  TablePager,
  TableSkeleton,
  TabIntro,
  qs,
  runAction,
  useApiData,
} from "./parts-shared";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

/** Requirement list rows carry live match counts from GET /api/requirements. */
export interface RequirementRow extends RequirementDTO {
  matchCount: number;
  topMatch: string | null;
}

export interface RequirementListResponse {
  items: RequirementRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface RequirementDetail {
  requirement: RequirementDTO;
  matches: RequirementMatchDTO[];
}

// ------------------------------------------------------------
// Requirement helpers (shared with the team dashboard tab)
// ------------------------------------------------------------

export function purposeLabel(purpose: string): string {
  return REQUIREMENT_PURPOSES.find((p) => p.value === purpose)?.label ?? purpose;
}

export function configLabel(bhk: number | null, propertyType: string): string {
  if (propertyType === "Any") return bhk ? `${bhk} BHK` : "Any home";
  return formatConfig(bhk, propertyType);
}

export function budgetLabel(min: number | null, max: number | null): string {
  return min || max ? formatPriceRange(min, max) : "Any budget";
}

function requirementStatusLabel(status: string): string {
  return REQUIREMENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function constructionLabel(status: string): string {
  if (status === "READY_TO_MOVE") return "Ready to move";
  if (status === "UNDER_CONSTRUCTION") return "Under construction";
  if (status === "NEW") return "New construction";
  return status;
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-600 text-white";
  if (score >= 60) return "bg-amber-500 text-white";
  return "bg-stone-600 text-white";
}

/** Adapts the requirements list response to the Pagination shape TablePager expects. */
export function listPagination(res: RequirementListResponse | null): Pagination | null {
  if (!res) return null;
  return {
    page: res.page,
    pageSize: res.pageSize,
    total: res.total,
    totalPages: Math.max(1, Math.ceil(res.total / res.pageSize)),
  };
}

// ------------------------------------------------------------
// Matched inventory card
// ------------------------------------------------------------

function MatchCard({ match, onOpen }: { match: RequirementMatchDTO; onOpen: (slug: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(match.slug)}
      className="group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-colors hover:border-primary/40"
      aria-label={`View ${match.title} listing`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {match.mainImage ? (
          <img
            src={match.mainImage}
            alt={match.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <Home className="size-8" aria-hidden="true" />
          </span>
        )}
        <span
          className={cn(
            "absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm",
            scoreTone(match.score)
          )}
        >
          {Math.round(match.score)}% match
        </span>
        {match.verificationStatus === "VERIFIED" ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white/90 px-2 py-0.5 text-[10px] font-medium text-emerald-800 shadow-sm">
            <ShieldCheck className="size-3 text-emerald-600" aria-hidden="true" />
            GPH Verified
          </span>
        ) : null}
      </div>
      <div className="grid gap-1.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{match.title}</p>
          <ExternalLink
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
        </div>
        <p className="font-display text-xl font-semibold text-foreground">{formatPrice(match.price)}</p>
        <p className="text-xs text-muted-foreground">
          {formatConfig(match.bhk, match.type)} · {match.locality}, {match.city}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatArea(match.carpetArea ?? match.builtUpArea)} · {constructionLabel(match.constructionStatus)}
        </p>
        {match.reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {match.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {reason}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}

// ------------------------------------------------------------
// Requirement detail dialog — brief + live matched inventory.
// Reused by the team dashboard (canAssign=false hides assignment).
// ------------------------------------------------------------

export function RequirementDetailDialog({
  requirementId,
  canAssign,
  teamMembers,
  onOpenChange,
  onChanged,
}: {
  requirementId: string;
  canAssign: boolean;
  teamMembers: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<RequirementDetail>(`/api/requirements/${requirementId}`);
      setDetail(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this requirement.");
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>, success: string, description?: string) {
    setBusy(true);
    const ok = await runAction(
      () =>
        api(`/api/requirements/${requirementId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      success,
      { description }
    );
    setBusy(false);
    if (ok) {
      await load();
      onChanged();
    }
    return ok;
  }

  function openProperty(slug: string) {
    onOpenChange(false);
    navigate(`/properties/${slug}`);
  }

  const requirement = detail?.requirement;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="font-display text-xl">
              {requirement ? requirement.name : "Requirement details"}
            </DialogTitle>
            {requirement ? <StatusBadge status={requirement.status} /> : null}
          </div>
          <DialogDescription>
            {requirement
              ? `${requirement.reference} · Wants to ${purposeLabel(requirement.purpose).toLowerCase()} in ${requirement.city}`
              : "Loading requirement…"}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="space-y-3 px-6 py-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="px-6 py-6">
            <EmptyState
              icon={<Inbox className="size-6" aria-hidden="true" />}
              title="Could not load requirement"
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : requirement ? (
          <div className="gph-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* Buyer contact + requirement brief */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyer</p>
                <div className="flex items-center gap-3">
                  <AvatarInitials name={requirement.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{requirement.name}</p>
                    <a href={`tel:${requirement.phone}`} className="text-xs text-primary hover:underline">
                      {requirement.phone}
                    </a>
                  </div>
                </div>
                {requirement.email ? (
                  <a
                    href={`mailto:${requirement.email}`}
                    className="flex items-center gap-1.5 truncate text-xs text-primary hover:underline"
                  >
                    <Mail className="size-3 shrink-0" aria-hidden="true" />
                    {requirement.email}
                  </a>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Posted {formatDateTime(requirement.createdAt)} · Source: {requirement.source}
                </p>
                {requirement.buyer ? (
                  <p className="text-xs text-muted-foreground">Registered account: {requirement.buyer.name}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" asChild variant="outline">
                    <a href={`tel:${requirement.phone}`}>
                      <Phone className="size-4" aria-hidden="true" />
                      Call buyer
                    </a>
                  </Button>
                  {requirement.email ? (
                    <Button size="sm" asChild variant="outline">
                      <a href={`mailto:${requirement.email}?subject=Your%20Gwalior%20Property%20Hub%20requirement%20${requirement.reference}`}>
                        <Mail className="size-4" aria-hidden="true" />
                        Email
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requirement brief
                </p>
                <p className="text-sm font-medium text-foreground">
                  {configLabel(requirement.bhk, requirement.propertyType)} ·{" "}
                  {purposeLabel(requirement.purpose)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {requirement.city}
                  {requirement.localities.length
                    ? ` · ${requirement.localities.join(", ")}`
                    : " · Any locality"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Budget:{" "}
                  <span className="font-medium text-foreground">
                    {budgetLabel(requirement.budgetMin, requirement.budgetMax)}
                  </span>
                </p>
                {requirement.notes ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs italic leading-relaxed text-foreground">
                    “{requirement.notes}”
                  </p>
                ) : null}
              </div>
            </div>

            {/* Pipeline actions */}
            <div className="grid gap-4 rounded-lg border bg-card p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline</p>
              <div className={cn("grid gap-4", canAssign && "sm:grid-cols-2")}>
                <div className="grid gap-2">
                  <Label htmlFor="req-status">Status</Label>
                  <Select
                    value={requirement.status}
                    onValueChange={(v) => patch({ status: v }, "Status updated", requirementStatusLabel(v))}
                    disabled={busy}
                  >
                    <SelectTrigger id="req-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUIREMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canAssign ? (
                  <div className="grid gap-2">
                    <Label htmlFor="req-owner">Assigned to</Label>
                    <Select
                      value={requirement.assignedTo?.id ?? "unassigned"}
                      onValueChange={(v) =>
                        patch(
                          { assignedToId: v === "unassigned" ? null : v },
                          v === "unassigned" ? "Requirement unassigned" : "Requirement assigned",
                          teamMembers.find((m) => m.id === v)?.name
                        )
                      }
                      disabled={busy}
                    >
                      <SelectTrigger id="req-owner" className="w-full" aria-label="Assign requirement owner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} · Team
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Matched inventory */}
            <div className="grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Matched inventory
                </p>
                <p className="text-xs text-muted-foreground">
                  {detail?.matches.length ?? 0} live {detail?.matches.length === 1 ? "listing" : "listings"}
                </p>
              </div>
              {!detail || detail.matches.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No live matches yet — listings in {requirement.city} will surface here as matching
                  inventory comes online.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.matches.map((match) => (
                    <MatchCard key={match.id} match={match} onOpen={openProperty} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Admin requirements tab
// ------------------------------------------------------------

export function AdminRequirements() {
  const [status, setStatus] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [assigned, setAssigned] = useState("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  // Active team members for assignment (admin only endpoint).
  useEffect(() => {
    let cancelled = false;
    api<{ data: { id: string; name: string; isActive: boolean; invitePending: boolean }[] }>("/api/admin/team")
      .then((res) => {
        if (!cancelled) {
          setTeamMembers(
            res.data
              .filter((m) => m.isActive && !m.invitePending)
              .map((m) => ({ id: m.id, name: m.name }))
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const { data, loading, error, refetch } = useApiData<RequirementListResponse>(
    () =>
      api(
        `/api/requirements${qs({
          status: status !== "ALL" ? status : null,
          city: city !== "ALL" ? city : null,
          assignedTo: assigned !== "all" ? assigned : null,
          page,
          pageSize: 10,
        })}`
      ),
    [status, city, assigned, page]
  );

  function patchRequirement(
    id: string,
    body: Record<string, unknown>,
    success: string,
    description?: string
  ) {
    return runAction(
      () =>
        api(`/api/requirements/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      success,
      { description }
    ).then((ok) => {
      if (ok) refetch();
      return ok;
    });
  }

  const requirements = data?.items ?? [];
  const filtersActive = status !== "ALL" || city !== "ALL" || assigned !== "all";

  return (
    <div>
      <TabIntro
        eyebrow="Buyer demand"
        title="Requirements"
        description="Buyer briefs from “Post Your Requirement” — what they're looking for, matched against live inventory. Briefs marked Matched already have listings ready to share."
      />
      <AdminCard bodyClassName="">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <ChipBar
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: "ALL", label: "All" },
              ...REQUIREMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            ariaLabel="Filter requirements by status"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={city}
              onValueChange={(v) => {
                setCity(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]" aria-label="Filter by city">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All cities</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c.city} value={c.city}>
                    {c.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={assigned}
              onValueChange={(v) => {
                setAssigned(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]" aria-label="Filter by assignment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : requirements.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Target className="size-6" aria-hidden="true" />}
              title={filtersActive ? "No requirements found" : "No requirements yet"}
              description={
                filtersActive
                  ? "No buyer briefs match the current filters. Try widening them."
                  : "They appear when buyers post what they're looking for. Briefs with live inventory matches arrive marked as Matched."
              }
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto gph-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.name}</p>
                        <a href={`tel:${r.phone}`} className="text-xs text-primary hover:underline">
                          {r.phone}
                        </a>
                        <p className="font-mono text-[11px] text-muted-foreground">{r.reference}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {configLabel(r.bhk, r.propertyType)} · {purposeLabel(r.purpose)}
                        </p>
                        <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                          {r.localities.length ? `${r.city} · ${r.localities.join(", ")}` : r.city}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.budgetMin || r.budgetMax ? (
                          <span className="font-medium text-foreground">
                            {formatPriceRange(r.budgetMin, r.budgetMax)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Any</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        {r.matchCount > 0 ? (
                          <>
                            <p className="font-medium text-foreground">
                              {r.matchCount} {r.matchCount === 1 ? "match" : "matches"}
                            </p>
                            {r.topMatch ? (
                              <p className="max-w-[200px] truncate text-xs text-muted-foreground" title={r.topMatch}>
                                {r.topMatch}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No matches yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.assignedTo ? (
                          <span className="text-foreground">{r.assignedTo.name}</span>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Actions for ${r.name}'s requirement`}
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{r.reference}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setOpenId(r.id)}>
                              <Eye className="size-4" aria-hidden="true" />
                              View matches
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-2">
                                <UserPlus className="size-4" aria-hidden="true" />
                                Assign to…
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-48">
                                {teamMembers.length === 0 ? (
                                  <DropdownMenuItem disabled>No active team members</DropdownMenuItem>
                                ) : (
                                  teamMembers.map((m) => (
                                    <DropdownMenuItem
                                      key={m.id}
                                      disabled={m.id === r.assignedTo?.id}
                                      onClick={() =>
                                        void patchRequirement(
                                          r.id,
                                          { assignedToId: m.id },
                                          "Requirement assigned",
                                          m.name
                                        )
                                      }
                                    >
                                      {m.id === r.assignedTo?.id ? (
                                        <Check className="size-4 text-primary" aria-hidden="true" />
                                      ) : (
                                        <span className="size-4 shrink-0" aria-hidden="true" />
                                      )}
                                      {m.name}
                                    </DropdownMenuItem>
                                  ))
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={!r.assignedTo}
                                  onClick={() =>
                                    void patchRequirement(r.id, { assignedToId: null }, "Requirement unassigned")
                                  }
                                >
                                  <UserMinus className="size-4" aria-hidden="true" />
                                  Unassign
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-2">
                                <Activity className="size-4" aria-hidden="true" />
                                Status
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-44">
                                {REQUIREMENT_STATUSES.map((s) => (
                                  <DropdownMenuItem
                                    key={s.value}
                                    disabled={s.value === r.status}
                                    onClick={() =>
                                      void patchRequirement(r.id, { status: s.value }, "Status updated", s.label)
                                    }
                                  >
                                    {s.value === r.status ? (
                                      <Check className="size-4 text-primary" aria-hidden="true" />
                                    ) : (
                                      <span className="size-4 shrink-0" aria-hidden="true" />
                                    )}
                                    {s.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={listPagination(data)} onPage={setPage} unit="requirements" />
          </>
        )}
      </AdminCard>

      {openId ? (
        <RequirementDetailDialog
          requirementId={openId}
          canAssign
          teamMembers={teamMembers}
          onOpenChange={(open) => {
            if (!open) setOpenId(null);
          }}
          onChanged={refetch}
        />
      ) : null}
    </div>
  );
}
