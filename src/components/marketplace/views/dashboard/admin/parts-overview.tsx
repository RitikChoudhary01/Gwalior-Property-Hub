"use client";

// ============================================================
// Admin overview — 13 KPI StatCards, enquiries trend chart
// (recharts), leads-by-status / properties-by-city breakdowns
// and quick-action cards. Every number comes from the API.
// ============================================================

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock,
  Home,
  Inbox,
  IndianRupee,
  Receipt,
  RefreshCw,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatNumber, formatPriceFull } from "@/lib/format";
import type { AdminStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "../../../shared/section";
import { AdminCard, CountBar, LoadError, TabIntro, useApiData } from "./parts-shared";

const STATUS_BAR_TONES: Record<string, string> = {
  NEW: "bg-sky-400",
  CONTACTED: "bg-amber-400",
  QUALIFIED: "bg-violet-400",
  SITE_VISIT_SCHEDULED: "bg-teal-400",
  SITE_VISIT_COMPLETED: "bg-cyan-400",
  NEGOTIATION: "bg-orange-400",
  BOOKING: "bg-lime-500",
  CONVERTED: "bg-emerald-500",
  LOST: "bg-rose-400",
};

function leadStatusLabel(status: string): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function AdminOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data, loading, error, refetch } = useApiData<AdminStats>(
    () => api("/api/admin/stats"),
    []
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <AdminCard>
        <LoadError message={error ?? "Platform stats are unavailable."} onRetry={refetch} />
      </AdminCard>
    );
  }

  const newLeads = data.leadsByStatus.find((s) => s.status === "NEW")?.count ?? 0;
  const maxStatusCount = Math.max(0, ...data.leadsByStatus.map((s) => s.count));
  const maxCityCount = Math.max(0, ...data.propertiesByCity.map((c) => c.count));

  const quickActions = [
    {
      label: "Pending approvals",
      value: formatNumber(data.pendingApprovals),
      description: "Listings and projects awaiting review",
      tab: "properties",
      icon: Clock,
      attention: data.pendingApprovals > 0,
    },
    {
      label: "New leads",
      value: formatNumber(newLeads),
      description: "Enquiries not yet contacted",
      tab: "leads",
      icon: Inbox,
      attention: newLeads > 0,
    },
    {
      label: "Site visits",
      value: formatNumber(data.siteVisits),
      description: "Visits scheduled platform-wide",
      tab: "visits",
      icon: CalendarDays,
      attention: false,
    },
    {
      label: "Outstanding commission",
      value: formatPriceFull(data.outstandingCommission),
      description: "Pending collections from closed deals",
      tab: "commissions",
      icon: IndianRupee,
      attention: data.outstandingCommission > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <TabIntro
        eyebrow="Command centre"
        title="Platform overview"
        description="Marketplace health, moderation queue, buyer activity and revenue at a glance."
        actions={
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {data.pendingBuilders > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 className="size-6 text-amber-700 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {data.pendingBuilders} Builder Approval Request{data.pendingBuilders > 1 ? "s" : ""} Pending
              </p>
              <p className="text-xs text-amber-800">
                New builders have registered and require verification before their developments are approved.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-amber-800 hover:bg-amber-900 text-white font-medium shadow-sm"
            onClick={() => onNavigate("users")}
          >
            Review Builder Requests
          </Button>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total users"
          value={formatNumber(data.totalUsers)}
          icon={<Users className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Buyers"
          value={formatNumber(data.buyers)}
          icon={<User className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Sellers"
          value={formatNumber(data.sellers)}
          icon={<Home className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Builders"
          value={formatNumber(data.builders)}
          icon={<Building2 className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Active properties"
          value={formatNumber(data.activeProperties)}
          icon={<Home className="size-5" aria-hidden="true" />}
        />
        <button
          type="button"
          onClick={() => onNavigate("properties")}
          className="text-left focus-visible:outline-none"
          aria-label="Go to pending approvals"
        >
          <StatCard
            label="Pending approvals"
            value={formatNumber(data.pendingApprovals)}
            sub="Tap to review the queue"
            icon={<Clock className="size-5" aria-hidden="true" />}
            className="w-full border-amber-300 bg-amber-50 transition-shadow hover:shadow-md"
          />
        </button>
        <StatCard
          label="Total enquiries"
          value={formatNumber(data.totalLeads)}
          icon={<Inbox className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Qualified leads"
          value={formatNumber(data.qualifiedLeads)}
          icon={<UserCheck className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Site visits"
          value={formatNumber(data.siteVisits)}
          icon={<CalendarDays className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Confirmed transactions"
          value={formatNumber(data.confirmedTransactions)}
          icon={<Receipt className="size-5" aria-hidden="true" />}
        />
      </div>

      {/* Revenue row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Commission earned"
          value={formatPriceFull(data.commissionEarned)}
          sub="Lifetime, all deals"
          icon={<IndianRupee className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Commission received"
          value={formatPriceFull(data.commissionReceived)}
          sub="Settled payments"
          icon={<IndianRupee className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Outstanding"
          value={formatPriceFull(data.outstandingCommission)}
          sub="Awaiting collection"
          icon={<AlertTriangle className="size-5" aria-hidden="true" />}
          className="border-amber-300 bg-amber-50"
        />
      </div>

      {/* Analytics row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Enquiries trend
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                New leads received over the last six months
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
              <TrendingUp className="size-4.5" aria-hidden="true" />
            </span>
          </div>
          <div className="h-64" role="img" aria-label="Bar chart of enquiries per month">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leadsByMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#78716c" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#78716c" }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(29, 107, 79, 0.06)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e7e5e4",
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Leads"
                  fill="#1D6B4F"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="font-display text-base font-semibold text-foreground">Leads by status</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Where enquiries sit in the pipeline</p>
          {data.leadsByStatus.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No leads recorded yet.</p>
          ) : (
            <div className="gph-scroll mt-4 max-h-60 space-y-3.5 overflow-y-auto pr-1">
              {data.leadsByStatus.map((s) => (
                <CountBar
                  key={s.status}
                  label={leadStatusLabel(s.status)}
                  value={s.count}
                  max={maxStatusCount}
                  barClassName={STATUS_BAR_TONES[s.status] ?? "bg-primary/75"}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Properties by city</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Where the active inventory is concentrated
        </p>
        {data.propertiesByCity.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No published properties yet.</p>
        ) : (
          <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.propertiesByCity.map((c) => (
              <CountBar key={c.city} label={c.city} value={c.count} max={maxCityCount} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onNavigate(action.tab)}
            className={
              "group rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none sm:p-5 " +
              (action.attention ? "border-amber-300" : "")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {action.label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-foreground">
                  {action.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              </div>
              <span
                className={
                  "grid size-10 shrink-0 place-items-center rounded-lg " +
                  (action.attention
                    ? "bg-amber-100 text-amber-700"
                    : "bg-accent text-accent-foreground")
                }
              >
                <action.icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
              Open
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
