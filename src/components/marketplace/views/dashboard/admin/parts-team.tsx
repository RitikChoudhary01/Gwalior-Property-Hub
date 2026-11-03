"use client";

// ============================================================
// Admin — internal team management: invite members by email,
// copy/resend invitation links, activate or deactivate accounts
// and monitor each member's lead load and conversions.
// Team accounts are invite-only; they never self-register.
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  Hourglass,
  Link2,
  MailPlus,
  MoreHorizontal,
  Power,
  Send,
  Trash2,
  UserCog,
  UsersRound,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { formatDate, formatMonthYear } from "@/lib/format";
import type { TeamMemberDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../../../shared/section";
import {
  AdminCard,
  AvatarInitials,
  LoadError,
  TableSkeleton,
  TabIntro,
  runAction,
  useApiData,
} from "./parts-shared";

// ------------------------------------------------------------
// Invite dialog
// ------------------------------------------------------------

function InviteDialog({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/team", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
        }),
      });
      toast.success("Invitation created", { description: `${name.trim()} will appear as a pending invite.` });
      onInvited();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailPlus className="size-5 text-primary" aria-hidden="true" />
            Invite a team member
          </DialogTitle>
          <DialogDescription>
            The member activates their account through the invitation link and gets access to the Team Dashboard.
            Team accounts cannot self-register.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="inv-name">Full name</Label>
            <Input
              id="inv-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Kavya Menon"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-email">Work email</Label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@vasati.in"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="inv-phone">Phone (optional)</Label>
              <Input id="inv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-city">City (optional)</Label>
              <Input id="inv-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Inviting…" : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Copy-link dialog (shown after invite / resend)
// ------------------------------------------------------------

function InviteLinkDialog({
  member,
  onClose,
}: {
  member: { name: string; email: string; inviteToken: string | null };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const link = member.inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/#/team-activate?token=${member.inviteToken}`
    : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invitation link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the link text manually.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" aria-hidden="true" />
            Invitation link for {member.name}
          </DialogTitle>
          <DialogDescription>
            {member.email} — share this single-use link so they can activate their account. Email delivery is used
            automatically when configured; otherwise copy the link and send it yourself.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          readOnly
          value={link}
          rows={3}
          aria-label="Invitation link"
          className="resize-none font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copy}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Team management tab
// ------------------------------------------------------------

export function AdminTeam() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkMember, setLinkMember] = useState<{ name: string; email: string; inviteToken: string | null } | null>(null);

  const { data, loading, error, refetch } = useApiData<{ data: TeamMemberDTO[] }>(() => api("/api/admin/team"), []);

  const members = data?.data ?? [];

  async function patchMember(member: TeamMemberDTO, action: "activate" | "deactivate" | "resend") {
    if (action === "resend") {
      try {
        const res = await api<{ member: { name: string; email: string; inviteToken: string } }>(
          `/api/admin/team/${member.id}`,
          { method: "PATCH", body: JSON.stringify({ action }) }
        );
        toast.success("Invitation refreshed", { description: member.name });
        setLinkMember(res.member);
        refetch();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not resend the invitation.");
      }
      return;
    }
    const okRes = await runAction(
      () =>
        api(`/api/admin/team/${member.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        }),
      `Member ${action}d`,
      { description: member.name }
    );
    if (okRes) refetch();
  }

  async function removeMember(member: TeamMemberDTO) {
    await runAction(
      () => api(`/api/admin/team/${member.id}`, { method: "DELETE" }),
      "Invitation revoked",
      { description: member.email }
    );
    refetch();
  }

  return (
    <div>
      <TabIntro
        eyebrow="Team"
        title="Internal team"
        description="Invite and manage Vasati team members. Members work the leads you assign to them — they never see financials, settings or other users' data."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserCog className="size-4" aria-hidden="true" />
            Invite member
          </Button>
        }
      />

      <AdminCard bodyClassName="">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : members.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<UsersRound className="size-6" aria-hidden="true" />}
              title="No team members yet"
              description="Invite your first internal team member — they'll activate their account through a secure link and start working assigned leads."
              action={
                <Button onClick={() => setInviteOpen(true)}>
                  <MailPlus className="size-4" aria-hidden="true" />
                  Invite member
                </Button>
              }
            />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned leads</TableHead>
                  <TableHead>Converted</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const status = m.invitePending
                    ? { label: "Pending invite", cls: "bg-amber-100 text-amber-800", icon: Hourglass }
                    : m.isActive
                      ? { label: "Active", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 }
                      : { label: "Deactivated", cls: "bg-rose-100 text-rose-800", icon: Power };
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={m.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{m.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                            {m.phone ? (
                              <p className="truncate text-xs text-muted-foreground">{m.phone}</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.cls}`}
                        >
                          <StatusIcon className="size-3" aria-hidden="true" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {m._count.assignedLeads}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({m._count.openLeads} open)
                          </span>
                        </p>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{m._count.convertedLeads}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.invitePending ? `Invited ${formatDate(m.createdAt)}` : formatMonthYear(m.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {m.invitePending ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setLinkMember({ name: m.name, email: m.email, inviteToken: m.inviteToken })
                              }
                            >
                              <Link2 className="size-4" aria-hidden="true" />
                              Invite link
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${m.name}`}>
                                <MoreHorizontal className="size-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {m.invitePending ? (
                                <>
                                  <DropdownMenuItem onClick={() => void patchMember(m, "resend")}>
                                    <Send className="size-4" aria-hidden="true" />
                                    Resend invite
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-600"
                                    onClick={() => void removeMember(m)}
                                  >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                    Revoke invitation
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => void patchMember(m, m.isActive ? "deactivate" : "activate")}>
                                    <Power className="size-4" aria-hidden="true" />
                                    {m.isActive ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminCard>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Assign leads to team members from the Leads CRM tab — members only ever see the leads assigned to them.
      </p>

      {inviteOpen ? <InviteDialog onClose={() => setInviteOpen(false)} onInvited={refetch} /> : null}
      {linkMember ? <InviteLinkDialog member={linkMember} onClose={() => setLinkMember(null)} /> : null}
    </div>
  );
}
