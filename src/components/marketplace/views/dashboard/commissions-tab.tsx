"use client";

// ============================================================
// CommissionsTab — shared "my commissions" view for SELLER and
// BUILDER dashboards. Shows the party's own commission
// agreements, the obligations raised on closed deals and the
// payment history behind each. Read-only: all figures come from
// the server (/api/agreements), which scopes data to the
// signed-in account.
// ============================================================

import { Fragment, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  IndianRupee,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { COMMISSION_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatPriceFull } from "@/lib/format";
import type { MyAgreementsDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, StatCard } from "../../shared/section";
import { StatusBadge } from "../../shared/status-badge";

function termsText(a: MyAgreementsDTO["agreements"][number]): string {
  return a.commissionType === "PERCENTAGE"
    ? `${a.commissionRate}% of sale value`
    : `Flat ${formatPriceFull(a.fixedFee)} per sale`;
}

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
];

function methodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method.replace(/_/g, " ").toLowerCase();
}

// ---------------- agreements section ----------------

function AgreementsList({ agreements }: { agreements: MyAgreementsDTO["agreements"] }) {
  if (agreements.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-6" aria-hidden="true" />}
        title="No commission agreement yet"
        description="Vasati charges a commission only when a deal closes. Our team sets up your agreement before your first transaction — nothing to pay to list or enquire."
      />
    );
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {agreements.map((a) => (
        <li key={a.id} className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{a.reference}</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">{termsText(a)}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Effective from</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatDate(a.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {a.endDate ? "Valid until" : "Validity"}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">{a.endDate ? formatDate(a.endDate) : "Ongoing"}</dd>
            </div>
          </dl>
          {a.notes && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

// ---------------- obligations table ----------------

function ObligationsTable({ commissions }: { commissions: MyAgreementsDTO["commissions"] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (commissions.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-6" aria-hidden="true" />}
        title="No commission obligations"
        description="When a deal you were part of closes, the commission due appears here with its payment history."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deal</TableHead>
            <TableHead>Property</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" aria-label="Toggle payment history" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((c) => {
            const balance = Math.max(0, c.amount - c.paidAmount);
            const expanded = open === c.id;
            return (
              <Fragment key={c.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setOpen(expanded ? null : c.id)}
                >
                  <TableCell>
                    <p className="font-mono text-xs text-muted-foreground">{c.transaction.reference}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {formatPriceFull(c.transaction.saleValue)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-52 truncate text-sm font-medium text-foreground">
                      {c.transaction.property.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.transaction.property.city}</p>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    {formatPriceFull(c.amount)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-700">
                    {formatPriceFull(c.paidAmount)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-rose-700">
                    {balance > 0 ? formatPriceFull(balance) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label={expanded ? "Hide payments" : "Show payments"}
                      aria-expanded={expanded}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(expanded ? null : c.id);
                      }}
                    >
                      {expanded ? (
                        <ChevronUp className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={7} className="px-4 py-3 sm:px-6">
                      {c.payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No payments recorded yet for this obligation.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {c.payments.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                              <span className="font-semibold text-foreground">{formatPriceFull(p.amount)}</span>
                              <span className="text-muted-foreground">via {methodLabel(p.method)}</span>
                              <span className="text-muted-foreground">on {formatDate(p.paidOn)}</span>
                              {p.reference && (
                                <span className="font-mono text-xs text-muted-foreground">ref {p.reference}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------- tab shell ----------------

export function CommissionsTab({ partyLabel }: { partyLabel: string }) {
  const [data, setData] = useState<MyAgreementsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    api<MyAgreementsDTO>("/api/agreements")
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load commissions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={<Wallet className="size-6" aria-hidden="true" />}
        title="Could not load commissions"
        description={error}
        action={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  const commissions = data?.commissions ?? [];
  const totalDue = commissions.reduce((s, c) => s + c.amount, 0);
  const totalPaid = commissions.reduce((s, c) => s + c.paidAmount, 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Commission &amp; payments
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            As a {partyLabel.toLowerCase()}, you pay Vasati a service commission only when a sale closes.
            Your agreement terms and every payment are recorded below — amounts are maintained by the
            Vasati team, so figures always reflect the official ledger.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total commission"
          value={formatPriceFull(totalDue)}
          sub={commissions.length > 0 ? `Across ${commissions.length} closed ${commissions.length === 1 ? "deal" : "deals"}` : "No closed deals yet"}
          icon={<Receipt className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Settled"
          value={formatPriceFull(totalPaid)}
          sub="Payments recorded"
          icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Outstanding"
          value={outstanding > 0 ? formatPriceFull(outstanding) : "Nothing due"}
          sub={outstanding > 0 ? "Payable to Vasati" : "All settled"}
          icon={<IndianRupee className={cn("size-5", outstanding > 0 && "text-rose-600")} aria-hidden="true" />}
        />
      </div>

      <section aria-labelledby="my-agreements">
        <h3 id="my-agreements" className="font-display text-lg font-semibold text-foreground">
          Your agreements
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Commission terms agreed with the Vasati team.
        </p>
        <div className="mt-4">
          <AgreementsList agreements={data?.agreements ?? []} />
        </div>
      </section>

      <section aria-labelledby="my-obligations">
        <h3 id="my-obligations" className="font-display text-lg font-semibold text-foreground">
          Commission obligations
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Amounts due on completed deals, with payment history. Click a row to expand.
        </p>
        <div className="mt-4">
          <ObligationsTable commissions={commissions} />
        </div>
      </section>
    </div>
  );
}
