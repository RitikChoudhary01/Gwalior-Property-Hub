"use client";

// ============================================================
// AdminDashboard — the platform command centre: overview KPIs,
// user management, listing moderation, leads CRM, visits,
// transactions, commissions, agreements and the audit log.
// ============================================================

import {
  Building2,
  CalendarDays,
  FileText,
  History,
  Home,
  Inbox,
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/lib/format";
import { AvatarInitials, useDashboardTab, VisitsBoard } from "./admin/parts-shared";
import { AdminOverview } from "./admin/parts-overview";
import { AdminUsers } from "./admin/parts-users";
import { AdminProperties, AdminProjects } from "./admin/parts-moderation";
import { AdminLeads } from "./admin/parts-leads";
import { AdminTransactions, AdminCommissions, AdminAgreements } from "./admin/parts-finance";
import { AdminAuditLog } from "./admin/parts-audit";

const ADMIN_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "properties", label: "Properties", icon: Home },
  { id: "projects", label: "Projects", icon: Building2 },
  { id: "leads", label: "Leads CRM", icon: Inbox },
  { id: "visits", label: "Site visits", icon: CalendarDays },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "commissions", label: "Commissions", icon: Wallet },
  { id: "agreements", label: "Agreements", icon: FileText },
  { id: "audit", label: "Audit log", icon: History },
] as const;

const ADMIN_TAB_IDS = ADMIN_TABS.map((t) => t.id);

export function AdminDashboard({ initialTab }: { initialTab?: string }) {
  const user = useAppStore((s) => s.user);
  const [tab, selectTab] = useDashboardTab(ADMIN_TAB_IDS, initialTab);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Vasati administration
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Command Centre
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Moderate listings, manage accounts, nurture leads and track platform revenue — all in
            one place.
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
            <AvatarInitials name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                Administrator · since {formatMonthYear(user.createdAt)}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mt-6 lg:flex lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav
            aria-label="Admin sections"
            className="sticky top-24 space-y-1 rounded-xl border bg-card p-2 shadow-sm"
          >
            {ADMIN_TABS.map((t) => {
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
            {ADMIN_TABS.map((t) => {
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

          {tab === "overview" ? <AdminOverview onNavigate={selectTab} /> : null}
          {tab === "users" ? <AdminUsers /> : null}
          {tab === "properties" ? <AdminProperties /> : null}
          {tab === "projects" ? <AdminProjects /> : null}
          {tab === "leads" ? <AdminLeads /> : null}
          {tab === "visits" ? (
            <VisitsBoard
              title="Site visits"
              description="Every property visit scheduled across the platform — confirm, reschedule or close the loop."
            />
          ) : null}
          {tab === "transactions" ? <AdminTransactions /> : null}
          {tab === "commissions" ? <AdminCommissions /> : null}
          {tab === "agreements" ? <AdminAgreements /> : null}
          {tab === "audit" ? <AdminAuditLog /> : null}
        </div>
      </div>
    </div>
  );
}
