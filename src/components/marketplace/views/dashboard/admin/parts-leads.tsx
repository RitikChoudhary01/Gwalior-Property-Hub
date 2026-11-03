"use client";

// ============================================================
// Admin leads CRM — filterable pipeline table with a full lead
// detail dialog: activity timeline, visits, status updates,
// assignment, follow-up date and notes.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  ExternalLink,
  Inbox,
  Phone,
  Plus,
  Send,
  StickyNote,
  UserPlus,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import type {
  LeadActivityDTO,
  LeadDTO,
  Paginated,
  SiteVisitDTO,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../../../shared/section";
import { StatusBadge } from "../../../shared/status-badge";
import {
  AdminCard,
  AvatarInitials,
  FilterBar,
  ImgThumb,
  LoadError,
  TablePager,
  TableSkeleton,
  TabIntro,
  qs,
  runAction,
  useApiData,
  useDebounced,
} from "./parts-shared";

function leadStatusLabel(status: string): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function activityIcon(type: string) {
  const t = type.toUpperCase();
  if (t.includes("NOTE") || t.includes("COMMENT")) return StickyNote;
  if (t.includes("STATUS")) return Activity;
  if (t.includes("CREAT")) return Plus;
  if (t.includes("ASSIGN")) return UserPlus;
  if (t.includes("CONTACT") || t.includes("CALL")) return Phone;
  if (t.includes("VISIT")) return CalendarDays;
  return Activity;
}

// ------------------------------------------------------------
// Lead detail dialog
// ------------------------------------------------------------

interface LeadDetail {
  lead: LeadDTO;
  activities: LeadActivityDTO[];
  visits: SiteVisitDTO[];
}

function LeadDetailDialog({
  leadId,
  onOpenChange,
  onChanged,
}: {
  leadId: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const user = useAppStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<LeadDetail>(`/api/leads/${leadId}`);
      setDetail(res);
      setFollowUp(res.lead.followUpDate ? res.lead.followUpDate.slice(0, 10) : "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this lead.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>, success: string, description?: string) {
    setBusy(true);
    const ok = await runAction(
      () =>
        api(`/api/leads/${leadId}`, {
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

  const lead = detail?.lead;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="font-display text-xl">{lead ? lead.name : "Lead details"}</DialogTitle>
            {lead ? <StatusBadge status={lead.status} /> : null}
          </div>
          <DialogDescription>
            {lead ? `${lead.reference} · Enquiry on ${lead.property.title}` : "Loading lead…"}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="space-y-3 px-6 py-6">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="px-6 py-6">
            <EmptyState
              icon={<Inbox className="size-6" aria-hidden="true" />}
              title="Could not load lead"
              description={error}
              action={
                <Button variant="outline" onClick={() => void load()}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : lead ? (
          <>
            <div className="vasati-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Contact + enquiry details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact
                  </p>
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={lead.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                      <a href={`tel:${lead.phone}`} className="text-xs text-primary hover:underline">
                        {lead.phone}
                      </a>
                                    </div>
                  </div>
                  {lead.email ? (
                    <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                  ) : null}
                  {lead.budget ? (
                    <p className="text-xs text-muted-foreground">
                      Budget: <span className="font-medium text-foreground">{formatPrice(lead.budget)}</span>
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Received {formatDateTime(lead.createdAt)} · Source: {lead.source}
                  </p>
                  {lead.lastContactedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Last contacted {formatDateTime(lead.lastContactedAt)}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Property enquiry
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/properties/${lead.property.slug}`);
                    }}
                    className="flex items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-primary/40"
                  >
                    <ImgThumb src={lead.property.mainImage} alt="" className="size-10 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {lead.property.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.property.locality}, {lead.property.city} · {formatPrice(lead.property.price)}
                      </p>
                    </div>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Listed by {lead.property.ownerName}
                  </p>
                  {lead.message ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-xs italic leading-relaxed text-foreground">
                      “{lead.message}”
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="grid gap-4 rounded-lg border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  CRM actions
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="lead-status">Pipeline status</Label>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => patch({ status: v }, "Status updated", leadStatusLabel(v))}
                      disabled={busy}
                    >
                      <SelectTrigger id="lead-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lead-followup">Follow-up date</Label>
                    <div className="flex gap-2">
                      <Input
                        id="lead-followup"
                        type="date"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        disabled={busy || !followUp || followUp === (lead.followUpDate ?? "").slice(0, 10)}
                        onClick={() =>
                          patch(
                            { followUpDate: new Date(`${followUp}T09:00:00`).toISOString() },
                            "Follow-up date saved",
                            formatDate(followUp)
                          )
                        }
                      >
                        Save
                      </Button>
                      {lead.followUpDate ? (
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => patch({ followUpDate: null }, "Follow-up date cleared")}
                          aria-label="Clear follow-up date"
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || lead.assignedTo?.id === user?.id}
                    onClick={() => patch({ assignedToId: user?.id }, "Lead assigned to you")}
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    {lead.assignedTo?.id === user?.id ? "Assigned to you" : "Assign to me"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => patch({ markContacted: true }, "Marked as contacted")}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    Mark contacted
                  </Button>
                  {lead.assignedTo ? (
                    <span className="inline-flex h-9 items-center rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground">
                      Owner: {lead.assignedTo.name}
                    </span>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground">
                      Unassigned
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-note">Add a note</Label>
                  <Textarea
                    id="lead-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Call outcome, negotiation notes, next steps…"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={busy || note.trim().length < 3}
                      onClick={async () => {
                        const ok = await patch({ note: note.trim() }, "Note added");
                        if (ok) setNote("");
                      }}
                    >
                      <Send className="size-4" aria-hidden="true" />
                      Add note
                    </Button>
                  </div>
                </div>
              </div>

              {/* Visits */}
              {detail.visits.length > 0 ? (
                <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Site visits
                  </p>
                  {detail.visits.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-foreground">
                        {formatDate(v.preferredDate)} · {v.preferredTime}
                      </span>
                      <span className="text-muted-foreground">{v.contactName}</span>
                      <StatusBadge status={v.status} />
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Activity timeline */}
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Activity timeline
                </p>
                {detail.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  <ol className="relative space-y-5 border-l border-border pl-5">
                    {detail.activities.map((a) => {
                      const Icon = activityIcon(a.type);
                      return (
                        <li key={a.id} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[31px] grid size-6 place-items-center rounded-full bg-accent text-accent-foreground"
                            )}
                          >
                            <Icon className="size-3" aria-hidden="true" />
                          </span>
                          <p className="text-sm leading-relaxed text-foreground">{a.note}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {a.user?.name ?? "System"} · {formatDateTime(a.createdAt)}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Leads table
// ------------------------------------------------------------

export function AdminLeads() {
  const [status, setStatus] = useState("ALL");
  const [assigned, setAssigned] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiData<Paginated<LeadDTO>>(
    () =>
      api(
        `/api/leads${qs({
          status: status !== "ALL" ? status : null,
          q: debouncedSearch || null,
          assignedTo: assigned,
          page,
          pageSize: 10,
        })}`
      ),
    [status, debouncedSearch, assigned, page]
  );

  function onStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  function onAssignedChange(value: string) {
    setAssigned(value);
    setPage(1);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const leads = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Leads CRM"
        title="Enquiry pipeline"
        description="Track every buyer enquiry from first contact to conversion."
      />
      <AdminCard bodyClassName="">
        <FilterBar
          search={search}
          onSearchChange={onSearchChange}
          placeholder="Search name, phone or reference…"
          ariaLabel="Search leads"
        >
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigned} onValueChange={onAssignedChange}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by assignment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="me">Assigned to me</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : leads.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Inbox className="size-6" aria-hidden="true" />}
              title="No leads found"
              description="No enquiries match the current filters. Try widening your search."
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {lead.reference}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <a href={`tel:${lead.phone}`} className="text-xs text-primary hover:underline">
                          {lead.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[200px] truncate font-medium text-foreground">
                          {lead.property.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{lead.property.city}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.assignedTo?.name ?? "Unassigned"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.followUpDate ? formatDate(lead.followUpDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setOpenLeadId(lead.id)}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="leads" />
          </>
        )}
      </AdminCard>

      {openLeadId ? (
        <LeadDetailDialog
          leadId={openLeadId}
          onOpenChange={(open) => {
            if (!open) setOpenLeadId(null);
          }}
          onChanged={refetch}
        />
      ) : null}
    </div>
  );
}
