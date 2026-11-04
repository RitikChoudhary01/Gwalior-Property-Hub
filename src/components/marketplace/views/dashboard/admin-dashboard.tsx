"use client";

// ============================================================
// AdminDashboard — the platform command centre: overview KPIs,
// user management, listing moderation, leads CRM, visits,
// transactions, commissions, agreements and the audit log.
// ============================================================

import { useState } from "react";
import {
  Building2,
  CalendarDays,
  FileText,
  History,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Receipt,
  Target,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/lib/format";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AvatarInitials, useDashboardTab, VisitsBoard } from "./admin/parts-shared";
import { AdminOverview } from "./admin/parts-overview";
import { AdminUsers } from "./admin/parts-users";
import { AdminTeam } from "./admin/parts-team";
import { AdminProperties, AdminProjects } from "./admin/parts-moderation";
import { AdminLeads } from "./admin/parts-leads";
import { AdminRequirements } from "./admin/parts-requirements";
import { AdminTransactions, AdminCommissions, AdminAgreements } from "./admin/parts-finance";
import { AdminAuditLog } from "./admin/parts-audit";

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("New password must be at least 8 characters and contain both a letter and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password changed successfully", {
        description: "Your administrator password has been updated.",
      });
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password. Check your current password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
          <span>Change Password</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your administrator password for this account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-pw">Current Password</Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with letters & numbers"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); reset(); }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Updating…
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ADMIN_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "properties", label: "Properties", icon: Home },
  { id: "projects", label: "Projects", icon: Building2 },
  { id: "leads", label: "Leads CRM", icon: Inbox },
  { id: "requirements", label: "Requirements", icon: Target },
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
            Gwalior Property Hub administration
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
              <AvatarInitials name={user.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Administrator · since {formatMonthYear(user.createdAt)}
                </p>
              </div>
            </div>
            <ChangePasswordDialog />
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
          <div className="mb-6 flex gap-2 overflow-x-auto gph-scroll pb-1 lg:hidden">
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
          {tab === "team" ? <AdminTeam /> : null}
          {tab === "properties" ? <AdminProperties /> : null}
          {tab === "projects" ? <AdminProjects /> : null}
          {tab === "leads" ? <AdminLeads /> : null}
          {tab === "requirements" ? <AdminRequirements /> : null}
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
