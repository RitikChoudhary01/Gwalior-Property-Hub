"use client";

// ============================================================
// TeamDashboard — the internal operations workspace for Vasati
// team members (invite-only accounts). Members see exclusively
// the leads assigned to them (enforced server-side) and manage
// the full operational cycle: contact buyers, update statuses,
// follow-up notes, site visits, tasks and activity history.
// Tabs: overview / leads / visits / tasks / activity / profile.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  Send,
  StickyNote,
  UserRound,
  Users,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES, ROLE_LABELS, VISIT_TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatDateTime, formatMonthYear, formatPrice } from "@/lib/format";
import type {
  LeadActivityDTO,
  LeadDTO,
  Paginated,
  SiteVisitDTO,
  TeamOverviewDTO,
  TeamTaskDTO,
} from "@/lib/types";
import { EmptyState, StatCard } from "../../shared/section";
import { StatusBadge } from "../../shared/status-badge";
import {
  AdminCard,
  AvatarInitials,
  ChipBar,
  CountBar,
  FilterBar,
  ImgThumb,
  LoadError,
  TablePager,
  TableSkeleton,
  TabIntro,
  VisitsBoard,
  qs,
  runAction,
  useApiData,
  useDashboardTab,
  useDebounced,
} from "./admin/parts-shared";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const TEAM_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "My leads", icon: Inbox },
  { id: "visits", label: "Site visits", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "activity", label: "My activity", icon: History },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

const TEAM_TAB_IDS = TEAM_TABS.map((t) => t.id);

function leadStatusLabel(status: string): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function activityIcon(type: string) {
  const t = type.toUpperCase();
  if (t.includes("NOTE") || t.includes("COMMENT")) return StickyNote;
  if (t.includes("STATUS")) return Activity;
  if (t.includes("ASSIGN")) return Users;
  if (t.includes("CONTACT") || t.includes("CALL")) return Phone;
  if (t.includes("VISIT")) return CalendarDays;
  return Activity;
}

const TASK_META: Record<TeamTaskDTO["kind"], { tone: string; chip: string }> = {
  FOLLOW_UP_DUE: { tone: "text-rose-700", chip: "bg-rose-100 text-rose-800" },
  FOLLOW_UP_TODAY: { tone: "text-amber-700", chip: "bg-amber-100 text-amber-800" },
  VISIT_TO_CONFIRM: { tone: "text-teal-700", chip: "bg-teal-100 text-teal-800" },
  VISIT_UPCOMING: { tone: "text-cyan-700", chip: "bg-cyan-100 text-cyan-800" },
  NEW_UNCONTACTED: { tone: "text-stone-700", chip: "bg-stone-200 text-stone-700" },
};

const TASK_LABELS: Record<TeamTaskDTO["kind"], string> = {
  FOLLOW_UP_DUE: "Follow-up overdue",
  FOLLOW_UP_TODAY: "Follow-up today",
  VISIT_TO_CONFIRM: "Confirm visit",
  VISIT_UPCOMING: "Upcoming visit",
  NEW_UNCONTACTED: "First contact",
};

// ============================================================
// Schedule-visit dialog (team schedules on behalf of a lead)
// ============================================================

function ScheduleVisitDialog({
  lead,
  onClose,
  onDone,
}: {
  lead: LeadDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("11:00 AM");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!date || !time) {
      setError("Pick a date and time slot for the visit.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/site-visits", {
        method: "POST",
        body: JSON.stringify({
          propertyId: lead.property.id,
          leadId: lead.id,
          contactName: lead.name,
          contactPhone: lead.phone,
          preferredDate: date,
          preferredTime: time,
          notes: notes.trim() || undefined,
        }),
      });
      toast.success("Site visit scheduled", {
        description: `${lead.name} · ${formatDate(date)} at ${time}`,
      });
      onClose();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not schedule the visit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule site visit</DialogTitle>
          <DialogDescription>
            Arrange a visit for {lead.name} to “{lead.property.title}” ({lead.property.locality},{" "}
            {lead.property.city}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sv-date">Date</Label>
            <Input
              id="sv-date"
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sv-time">Time slot</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="sv-time" className="w-full">
                <SelectValue />
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
          <div className="grid gap-2">
            <Label htmlFor="sv-notes">Notes (optional)</Label>
            <Textarea
              id="sv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the listing owner should prepare…"
              rows={2}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CalendarClock className="size-4" aria-hidden="true" />}
            Schedule visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Lead detail dialog — team edition
// ============================================================

interface LeadDetail {
  lead: LeadDTO;
  activities: LeadActivityDTO[];
  visits: SiteVisitDTO[];
}

function TeamLeadDialog({
  leadId,
  onOpenChange,
  onChanged,
}: {
  leadId: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [scheduling, setScheduling] = useState(false);

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
              {/* Contact + property */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyer contact</p>
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
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 truncate text-xs text-primary hover:underline">
                      <Mail className="size-3 shrink-0" aria-hidden="true" />
                      {lead.email}
                    </a>
                  ) : null}
                  {lead.budget ? (
                    <p className="text-xs text-muted-foreground">
                      Budget: <span className="font-medium text-foreground">{formatPrice(lead.budget)}</span>
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Received {formatDateTime(lead.createdAt)}</p>
                  {lead.lastContactedAt ? (
                    <p className="text-xs text-muted-foreground">Last contacted {formatDateTime(lead.lastContactedAt)}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" asChild variant="outline">
                      <a href={`tel:${lead.phone}`}>
                        <Phone className="size-4" aria-hidden="true" />
                        Call buyer
                      </a>
                    </Button>
                    {lead.email ? (
                      <Button size="sm" asChild variant="outline">
                        <a href={`mailto:${lead.email}?subject=Your%20Vasati%20enquiry%20${lead.reference}`}>
                          <Mail className="size-4" aria-hidden="true" />
                          Email
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 rounded-lg border bg-card p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property enquiry</p>
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
                      <p className="truncate text-sm font-medium text-foreground">{lead.property.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.property.locality}, {lead.property.city} · {formatPrice(lead.property.price)}
                      </p>
                    </div>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                  <p className="text-xs text-muted-foreground">Listed by {lead.property.ownerName}</p>
                  {lead.message ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-xs italic leading-relaxed text-foreground">
                      “{lead.message}”
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="grid gap-4 rounded-lg border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Work the lead</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="tl-status">Pipeline status</Label>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => patch({ status: v }, "Status updated", leadStatusLabel(v))}
                      disabled={busy}
                    >
                      <SelectTrigger id="tl-status" className="w-full">
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
                    <Label htmlFor="tl-followup">Follow-up date</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tl-followup"
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
                    disabled={busy}
                    onClick={() => patch({ markContacted: true }, "Marked as contacted")}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    Mark contacted
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setScheduling(true)}>
                    <CalendarClock className="size-4" aria-hidden="true" />
                    Schedule site visit
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tl-note">Add a follow-up note</Label>
                  <Textarea
                    id="tl-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Call outcome, buyer preferences, next steps…"
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site visits</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity timeline</p>
                {detail.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  <ol className="relative space-y-5 border-l border-border pl-5">
                    {detail.activities.map((a) => {
                      const Icon = activityIcon(a.type);
                      return (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[31px] grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
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

      {scheduling && lead ? (
        <ScheduleVisitDialog
          lead={lead}
          onClose={() => setScheduling(false)}
          onDone={() => {
            setScheduling(false);
            void load();
            onChanged();
          }}
        />
      ) : null}
    </Dialog>
  );
}

// ============================================================
// Overview tab
// ============================================================

function TeamOverviewTab({
  onOpenLead,
  onGoToTasks,
  onGoToLeads,
}: {
  onOpenLead: (leadId: string) => void;
  onGoToTasks: () => void;
  onGoToLeads: () => void;
}) {
  const { data, loading, error, refetch } = useApiData<TeamOverviewDTO>(() => api("/api/team/overview"), []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <AdminCard>
        <LoadError message={error ?? "Could not load your dashboard."} onRetry={refetch} />
      </AdminCard>
    );
  }

  const maxPipeline = Math.max(1, ...data.pipeline.map((p) => p.count));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned leads" value={data.stats.assigned} icon={<Inbox className="size-5 text-primary" aria-hidden="true" />} />
        <StatCard label="Open leads" value={data.stats.open} icon={<Users className="size-5 text-primary" aria-hidden="true" />} />
        <StatCard
          label="Follow-ups due"
          value={data.stats.dueFollowUps}
          sub="today or overdue"
          icon={<Clock className="size-5 text-primary" aria-hidden="true" />}
        />
        <StatCard
          label="Upcoming visits"
          value={data.stats.upcomingVisits}
          icon={<CalendarDays className="size-5 text-primary" aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming follow-ups */}
        <AdminCard title="Upcoming follow-ups" description="Your next scheduled buyer touchpoints.">
          <div className="p-4 sm:p-5">
            {data.followUps.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No follow-ups scheduled. Set one from a lead to stay on track.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.followUps.map((lead) => {
                  const due = lead.followUpDate ? new Date(lead.followUpDate) : null;
                  const overdue = due ? due < new Date() : false;
                  return (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead.id)}
                        className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40"
                      >
                        <ImgThumb src={lead.property.mainImage} alt="" className="size-11 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {lead.property.title} · {lead.property.city}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={cn("text-xs font-semibold", overdue ? "text-rose-600" : "text-foreground")}>
                            {due ? formatDate(due.toISOString()) : "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{overdue ? "Overdue" : "Scheduled"}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>

        {/* Pipeline snapshot */}
        <AdminCard title="My pipeline" description="Where your assigned leads stand right now.">
          <div className="grid gap-4 p-4 sm:p-5">
            {data.pipeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No leads assigned yet — an administrator will assign enquiries to you.
              </p>
            ) : (
              data.pipeline
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((p) => (
                  <CountBar key={p.status} label={leadStatusLabel(p.status)} value={p.count} max={maxPipeline} />
                ))
            )}
            <Button variant="outline" className="justify-between" onClick={onGoToLeads}>
              Open my leads
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </AdminCard>
      </div>

      {/* Today's worklist preview */}
      <AdminCard
        title="Worklist"
        description="What needs your attention right now."
        action={
          <Button variant="outline" size="sm" onClick={onGoToTasks}>
            View all tasks
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        }
      >
        <div className="divide-y">
          {data.tasks.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              All clear — no follow-ups, first contacts or visits pending.
            </p>
          ) : (
            data.tasks.slice(0, 4).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => task.leadId && onOpenLead(task.leadId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 sm:px-5"
              >
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    TASK_META[task.kind].chip
                  )}
                >
                  {TASK_LABELS[task.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{task.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{task.detail}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </AdminCard>
    </div>
  );
}

// ============================================================
// Leads tab
// ============================================================

function TeamLeadsTab({ onOpenLead, refreshKey }: { onOpenLead: (leadId: string) => void; refreshKey: number }) {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useApiData<Paginated<LeadDTO>>(
    () =>
      api(
        `/api/leads${qs({
          status: status !== "ALL" ? status : null,
          q: debouncedSearch || null,
          page,
          pageSize: 10,
        })}`
      ),
    [status, debouncedSearch, page, refreshKey]
  );

  const leads = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="My leads"
        title="Assigned enquiries"
        description="Buyer enquiries the team lead has assigned to you — call, qualify and move them through the pipeline."
      />
      <AdminCard bodyClassName="">
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name, phone or reference…"
          ariaLabel="Search leads"
        >
          <ChipBar
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[{ value: "ALL", label: "All" }, ...LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
          />
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
              description={
                status === "ALL"
                  ? "You have no assigned enquiries yet. An administrator will assign leads to you as they come in."
                  : "No assigned leads match this filter."
              }
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const due = lead.followUpDate ? new Date(lead.followUpDate) : null;
                    const overdue = due ? due < new Date() && !["CONVERTED", "LOST"].includes(lead.status) : false;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{lead.reference}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{lead.name}</p>
                          <a href={`tel:${lead.phone}`} className="text-xs text-primary hover:underline">
                            {lead.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate font-medium text-foreground">{lead.property.title}</p>
                          <p className="text-xs text-muted-foreground">{lead.property.city}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className={cn("text-xs", overdue ? "font-semibold text-rose-600" : "text-muted-foreground")}>
                          {due ? formatDate(due.toISOString()) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>
                            <MessageSquareText className="size-4" aria-hidden="true" />
                            Work lead
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="leads" />
          </>
        )}
      </AdminCard>
    </div>
  );
}

// ============================================================
// Tasks tab
// ============================================================

function TeamTasksTab({ onOpenLead, onRefresh }: { onOpenLead: (leadId: string) => void; onRefresh: () => void }) {
  const { data, loading, error, refetch } = useApiData<TeamOverviewDTO>(() => api("/api/team/overview"), []);

  async function confirmVisit(task: TeamTaskDTO) {
    if (!task.visitId) return;
    await runAction(
      () =>
        api(`/api/site-visits/${task.visitId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CONFIRMED" }),
        }),
      "Visit confirmed",
      { onDone: refetch }
    );
    onRefresh();
  }

  const grouped = useMemo(() => {
    const g: Record<string, TeamTaskDTO[]> = {};
    for (const t of data?.tasks ?? []) {
      (g[t.kind] ??= []).push(t);
    }
    return g;
  }, [data]);

  return (
    <div>
      <TabIntro
        eyebrow="Tasks"
        title="My worklist"
        description="Everything that needs your attention — overdue follow-ups, first contacts and site visits — generated automatically from your leads."
      />
      {loading ? (
        <AdminCard>
          <TableSkeleton rows={6} />
        </AdminCard>
      ) : error ? (
        <AdminCard>
          <LoadError message={error} onRetry={refetch} />
        </AdminCard>
      ) : (data?.tasks.length ?? 0) === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" aria-hidden="true" />}
          title="You're all caught up"
          description="No follow-ups due, new leads waiting, or visits to confirm. Check back after your next buyer conversation."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([kind, tasks]) => (
            <AdminCard key={kind} title={TASK_LABELS[kind as TeamTaskDTO["kind"]]} description={`${tasks.length} ${tasks.length === 1 ? "item" : "items"}`}>
              <ul className="divide-y">
                {tasks.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        TASK_META[task.kind].chip
                      )}
                    >
                      {TASK_LABELS[task.kind]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{task.detail}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {task.kind === "VISIT_TO_CONFIRM" && task.visitId ? (
                        <Button size="sm" variant="outline" onClick={() => void confirmVisit(task)}>
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          Confirm
                        </Button>
                      ) : null}
                      {task.leadId ? (
                        <Button size="sm" onClick={() => onOpenLead(task.leadId!)}>
                          Open lead
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Activity tab
// ============================================================

function TeamActivityTab({ refreshKey }: { refreshKey: number }) {
  const { data, loading, error, refetch } = useApiData<TeamOverviewDTO>(() => api("/api/team/overview"), [refreshKey]);

  const activities = data?.activities ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="My activity"
        title="Activity history"
        description="Every note, status change and visit you've recorded across your assigned leads."
      />
      <AdminCard>
        {loading ? (
          <div className="space-y-4 p-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : activities.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<History className="size-6" aria-hidden="true" />}
              title="No activity yet"
              description="Your notes, status updates and scheduled visits will appear here."
            />
          </div>
        ) : (
          <ol className="relative space-y-6 border-l border-border p-5 pl-8">
            {activities.map((a) => {
              const Icon = activityIcon(a.type);
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[37px] grid size-7 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-relaxed text-foreground">{a.note}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.lead ? (
                      <>
                        {a.lead.reference} · {a.lead.name} ·{" "}
                      </>
                    ) : null}
                    {formatDateTime(a.createdAt)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </AdminCard>
    </div>
  );
}

// ============================================================
// Profile tab
// ============================================================

function TeamProfileTab() {
  const user = useAppStore((s) => s.user);
  if (!user) return null;

  return (
    <div>
      <TabIntro
        eyebrow="Profile"
        title="My profile"
        description="Your internal Vasati staff profile. Contact the administration team to update these details."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminCard title="Account">
          <dl className="grid gap-4 p-4 sm:p-5">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{user.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">City</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{user.city ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Role</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{ROLE_LABELS[user.role]}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Member since</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{formatMonthYear(user.createdAt)}</dd>
            </div>
          </dl>
        </AdminCard>
        <AdminCard title="What you can do" description="Your operational permissions as a Vasati team member.">
          <ul className="grid gap-3 p-4 text-sm text-muted-foreground sm:p-5">
            {[
              "Work the buyer enquiries assigned to you — call, email and qualify buyers.",
              "Update operational lead statuses and follow-up dates.",
              "Add follow-up notes and schedule or update site visits.",
              "View your own task list, upcoming follow-ups and activity history.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
            Commission rates, financial settings and user management are handled by administrators.
          </p>
        </AdminCard>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard shell
// ============================================================

export function TeamDashboard({ initialTab }: { initialTab?: string }) {
  const user = useAppStore((s) => s.user);
  const [tab, selectTab] = useDashboardTab(TEAM_TAB_IDS, initialTab);

  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function openLead(leadId: string) {
    setOpenLeadId(leadId);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Vasati operations</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Lead workspace
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Manage your assigned buyer enquiries, follow-ups, site visits and tasks — everything you need to close
            deals, in one place.
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
            <AvatarInitials name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]} · since {formatMonthYear(user.createdAt)}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mt-6 lg:flex lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav
            aria-label="Team sections"
            className="sticky top-24 space-y-1 rounded-xl border bg-card p-2 shadow-sm"
          >
            {TEAM_TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <t.icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile tab bar */}
          <div className="mb-6 flex gap-2 overflow-x-auto vasati-scroll pb-1 lg:hidden">
            {TEAM_TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <t.icon className="size-4" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "overview" ? (
            <TeamOverviewTab
              onOpenLead={openLead}
              onGoToTasks={() => selectTab("tasks")}
              onGoToLeads={() => selectTab("leads")}
            />
          ) : null}
          {tab === "leads" ? <TeamLeadsTab onOpenLead={openLead} refreshKey={refreshKey} /> : null}
          {tab === "visits" ? (
            <VisitsBoard
              title="Site visits"
              description="Confirm, reschedule and complete visits for your assigned leads."
            />
          ) : null}
          {tab === "tasks" ? <TeamTasksTab onOpenLead={openLead} onRefresh={bumpRefresh} /> : null}
          {tab === "activity" ? <TeamActivityTab refreshKey={refreshKey} /> : null}
          {tab === "profile" ? <TeamProfileTab /> : null}
        </div>
      </div>

      {openLeadId ? (
        <TeamLeadDialog
          leadId={openLeadId}
          onOpenChange={(open) => {
            if (!open) setOpenLeadId(null);
          }}
          onChanged={bumpRefresh}
        />
      ) : null}
    </div>
  );
}
