"use client";

// ============================================================
// Admin finance — transactions (deal records + commission due),
// commissions (payment collection + history) and agreements
// (seller / builder commission contracts).
// ============================================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  IndianRupee,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { TRANSACTION_STATUSES } from "@/lib/constants";
import { formatDate, formatNumber, formatPriceFull } from "@/lib/format";
import type {
  AdminUserDTO,
  AgreementDTO,
  CommissionDTO,
  LeadDTO,
  Paginated,
  TransactionDTO,
} from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, StatCard } from "../../../shared/section";
import { StatusBadge } from "../../../shared/status-badge";
import {
  AdminCard,
  ChipBar,
  LoadError,
  TableSkeleton,
  TabIntro,
  qs,
  runAction,
  useApiData,
} from "./parts-shared";

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
];

function methodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method.replace(/_/g, " ");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// Transactions
// ============================================================

function RecordTransactionDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: leadsData, loading: leadsLoading } = useApiData<Paginated<LeadDTO>>(
    () => api("/api/leads?pageSize=100"),
    []
  );
  const eligible = (leadsData?.data ?? []).filter((l) =>
    ["NEGOTIATION", "BOOKING", "SITE_VISIT_COMPLETED"].includes(l.status)
  );

  const [leadId, setLeadId] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [bookingDate, setBookingDate] = useState(today());
  const [agreementRef, setAgreementRef] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = eligible.find((l) => l.id === leadId) ?? null;

  function onLeadChange(value: string) {
    setLeadId(value);
    setError(null);
    const lead = eligible.find((l) => l.id === value);
    if (lead && !saleValue) setSaleValue(String(lead.property.price));
  }

  async function submit() {
    const value = Number(saleValue);
    if (!leadId) {
      setError("Select the lead this transaction belongs to.");
      return;
    }
    if (!saleValue || !Number.isFinite(value) || value <= 0) {
      setError("Enter a valid sale value.");
      return;
    }
    if (!bookingDate) {
      setError("Pick the booking date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/transactions", {
        method: "POST",
        body: JSON.stringify({
          leadId,
          saleValue: value,
          bookingDate,
          agreementRef: agreementRef.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast.success("Transaction recorded", {
        description: `${selected?.name ?? "Lead"} — ${formatPriceFull(value)}`,
      });
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          `${err.message} Create or reactivate a commission agreement for this seller or builder under the Agreements tab first.`
        );
        toast.error("No active agreement", {
          description:
            "Commission is computed from the applicable ACTIVE agreement — create one under Agreements before recording this transaction.",
        });
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record transaction</DialogTitle>
          <DialogDescription>
            Log a closed deal. Commission is calculated automatically from the applicable listing
            agreement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="txn-lead">Lead</Label>
            {leadsLoading ? (
              <p className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading leads…
              </p>
            ) : eligible.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                No leads are currently in negotiation, booking or visit-completed stage.
              </p>
            ) : (
              <Select value={leadId} onValueChange={onLeadChange}>
                <SelectTrigger id="txn-lead" className="w-full">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} · {l.property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selected ? (
              <p className="text-xs text-muted-foreground">
                {selected.reference} · {selected.property.title}, {selected.property.city}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-value">Sale value (₹)</Label>
            <Input
              id="txn-value"
              type="number"
              min={0}
              value={saleValue}
              onChange={(e) => setSaleValue(e.target.value)}
              placeholder="e.g. 14500000"
            />
            <p className="text-xs text-muted-foreground">
              {saleValue && Number(saleValue) > 0 ? formatPriceFull(Number(saleValue)) : "Final agreed deal value"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-date">Booking date</Label>
            <Input
              id="txn-date"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-agreement">Agreement reference (optional)</Label>
            <Input
              id="txn-agreement"
              value={agreementRef}
              onChange={(e) => setAgreementRef(e.target.value)}
              placeholder="External agreement document reference"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-notes">Notes (optional)</Label>
            <Textarea
              id="txn-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deal context, payment plan, etc."
              rows={3}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || leadsLoading || eligible.length === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Record transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminTransactions() {
  const [status, setStatus] = useState("ALL");
  const [recordOpen, setRecordOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiData<{ data: TransactionDTO[] }>(
    () => api(`/api/admin/transactions${qs({ status: status !== "ALL" ? status : null })}`),
    [status]
  );

  const transactions = data?.data ?? [];
  const kpis = {
    count: transactions.length,
    saleValue: transactions.reduce((sum, t) => sum + t.saleValue, 0),
    commission: transactions.reduce((sum, t) => sum + (t.commission?.amount ?? 0), 0),
    paid: transactions.reduce((sum, t) => sum + (t.commission?.paidAmount ?? 0), 0),
    outstanding: transactions.reduce(
      (sum, t) => sum + ((t.commission?.amount ?? 0) - (t.commission?.paidAmount ?? 0)),
      0
    ),
  };

  async function markCompleted(txn: TransactionDTO) {
    setBusyId(txn.id);
    await runAction(
      () =>
        api(`/api/admin/transactions/${txn.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "COMPLETED" }),
        }),
      "Transaction marked completed",
      { description: txn.reference, onDone: refetch }
    );
    setBusyId(null);
  }

  return (
    <div>
      <TabIntro
        eyebrow="Finance"
        title="Transactions"
        description="Every recorded deal with its commission position."
        actions={
          <Button onClick={() => setRecordOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Record transaction
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Transactions" value={formatNumber(kpis.count)} sub={status !== "ALL" ? "Current filter" : "All statuses"} />
        <StatCard label="Sale value" value={formatPriceFull(kpis.saleValue)} sub="Agreed deal value" />
        <StatCard label="Commission earned" value={formatPriceFull(kpis.commission)} sub="On these deals" />
        <StatCard label="Commission received" value={formatPriceFull(kpis.paid)} sub="Payments collected" />
        <StatCard
          label="Outstanding"
          value={formatPriceFull(kpis.outstanding)}
          sub="Awaiting collection"
          className={kpis.outstanding > 0 ? "border-amber-300 bg-amber-50" : undefined}
        />
      </div>

      <AdminCard bodyClassName="">
        <div className="border-b p-4 sm:px-5">
          <ChipBar
            value={status}
            onChange={setStatus}
            options={[
              { value: "ALL", label: "All" },
              ...TRANSACTION_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
        </div>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : transactions.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Receipt className="size-6" aria-hidden="true" />}
              title="No transactions yet"
              description="Record a transaction when a deal closes — commission is computed from the applicable agreement."
              action={
                <Button onClick={() => setRecordOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  Record transaction
                </Button>
              }
            />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto gph-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Sale value</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.reference}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="max-w-[200px] truncate font-medium text-foreground">
                          {t.property.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.property.locality}, {t.property.city}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.lead?.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.buyer?.name ?? "—"}</TableCell>
                    <TableCell className="font-medium">{formatPriceFull(t.saleValue)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(t.bookingDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      {t.commission ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {formatPriceFull(t.commission.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Paid {formatPriceFull(t.commission.paidAmount)}
                          </p>
                          <StatusBadge status={t.commission.status} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No commission</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === "PENDING" || t.status === "CONFIRMED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === t.id}
                          onClick={() => markCompleted(t)}
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Mark completed
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminCard>

      {recordOpen ? (
        <RecordTransactionDialog onClose={() => setRecordOpen(false)} onDone={refetch} />
      ) : null}
    </div>
  );
}

// ============================================================
// Commissions
// ============================================================

function RecordPaymentDialog({
  commission,
  onClose,
  onDone,
}: {
  commission: CommissionDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const outstanding = commission.amount - commission.paidAmount;
  const [amount, setAmount] = useState(String(Math.max(0, outstanding)));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (value > outstanding + 0.01) {
      setError(`Amount cannot exceed the outstanding ${formatPriceFull(outstanding)}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/commissions/${commission.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "record_payment",
          amount: value,
          method,
          paidOn,
          reference: reference.trim() || undefined,
        }),
      });
      toast.success("Payment recorded", {
        description: `${formatPriceFull(value)} · ${commission.transaction.reference}`,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record commission payment</DialogTitle>
          <DialogDescription>
            {commission.transaction.property.title} · Outstanding{" "}
            {formatPriceFull(outstanding)} of {formatPriceFull(commission.amount)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="payment-amount">Amount (₹)</Label>
            <Input
              id="payment-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {amount && Number(amount) > 0 ? formatPriceFull(Number(amount)) : "Amount received"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-method">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-reference">Reference (optional)</Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / cheque number"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-date">Paid on</Label>
            <Input
              id="payment-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCommissions() {
  const [status, setStatus] = useState("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<CommissionDTO | null>(null);

  const { data, loading, error, refetch } = useApiData<{ data: CommissionDTO[] }>(
    () => api(`/api/admin/commissions${qs({ status: status !== "ALL" ? status : null })}`),
    [status]
  );

  const commissions = data?.data ?? [];

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <TabIntro
        eyebrow="Finance"
        title="Commissions"
        description="Track commission earned on every deal and record payments as they are collected."
      />
      <AdminCard bodyClassName="">
        <div className="border-b p-4 sm:px-5">
          <ChipBar
            value={status}
            onChange={setStatus}
            options={[
              { value: "ALL", label: "All" },
              { value: "PENDING", label: "Payment pending" },
              { value: "PARTIAL", label: "Partially paid" },
              { value: "PAID", label: "Fully paid" },
            ]}
          />
        </div>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : commissions.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Wallet className="size-6" aria-hidden="true" />}
              title="No commissions found"
              description="Commissions are created automatically when you record a transaction against a lead with an active agreement."
            />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto gph-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" aria-label="Expand payments" />
                  <TableHead>Transaction</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Sale value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => {
                  const outstanding = c.amount - c.paidAmount;
                  const isOpen = expanded.has(c.id);
                  return [
                    <TableRow key={c.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => toggleExpanded(c.id)}
                          aria-label={isOpen ? "Hide payments" : "Show payments"}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (
                            <ChevronUp className="size-4" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="size-4" aria-hidden="true" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {c.transaction.reference}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[180px] truncate font-medium text-foreground">
                          {c.transaction.property.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.transaction.property.city}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPriceFull(c.transaction.saleValue)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.commissionType === "PERCENTAGE"
                          ? `${c.rate}%`
                          : "Fixed fee"}
                      </TableCell>
                      <TableCell className="font-medium">{formatPriceFull(c.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPriceFull(c.paidAmount)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium",
                          outstanding > 0 ? "text-amber-700" : "text-muted-foreground"
                        )}
                      >
                        {formatPriceFull(Math.max(0, outstanding))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.dueDate ? formatDate(c.dueDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={outstanding <= 0}
                          onClick={() => setPaying(c)}
                        >
                          <IndianRupee className="size-4" aria-hidden="true" />
                          Record payment
                        </Button>
                      </TableCell>
                    </TableRow>,
                    isOpen ? (
                      <TableRow key={`${c.id}-payments`} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={11} className="px-4 py-3 sm:px-5">
                          {c.payments.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No payments recorded yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Payment history
                              </p>
                              {c.payments.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border bg-card px-3 py-2 text-xs"
                                >
                                  <span className="font-semibold text-foreground">
                                    {formatPriceFull(p.amount)}
                                  </span>
                                  <span className="text-muted-foreground">{methodLabel(p.method)}</span>
                                  <span className="text-muted-foreground">
                                    {p.reference ? `Ref ${p.reference}` : "No reference"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    Paid on {formatDate(p.paidOn)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminCard>

      {paying ? (
        <RecordPaymentDialog commission={paying} onClose={() => setPaying(null)} onDone={refetch} />
      ) : null}
    </div>
  );
}

// ============================================================
// Agreements
// ============================================================

function NewAgreementDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [partyType, setPartyType] = useState<"SELLER" | "BUILDER">("SELLER");
  const [parties, setParties] = useState<AdminUserDTO[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [partyId, setPartyId] = useState("");
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [rate, setRate] = useState("");
  const [fee, setFee] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadParties = async () => {
      setPartiesLoading(true);
      try {
        const res = await api<Paginated<AdminUserDTO>>(
          `/api/admin/users${qs({ role: partyType, pageSize: 100 })}`
        );
        if (!cancelled) setParties(res.data);
      } catch {
        if (!cancelled) setParties([]);
      } finally {
        if (!cancelled) setPartiesLoading(false);
      }
    };
    void loadParties();
    return () => {
      cancelled = true;
    };
  }, [partyType]);

  async function submit() {
    if (!partyId) {
      setError("Select the seller or builder this agreement is with.");
      return;
    }
    if (commissionType === "PERCENTAGE" && (!rate || Number(rate) <= 0)) {
      setError("Enter the commission percentage (e.g. 1.0 for 1%).");
      return;
    }
    if (commissionType === "FIXED" && (!fee || Number(fee) <= 0)) {
      setError("Enter the fixed commission fee.");
      return;
    }
    if (!startDate) {
      setError("Pick the agreement start date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/agreements", {
        method: "POST",
        body: JSON.stringify({
          partyType,
          partyId,
          commissionType,
          ...(commissionType === "PERCENTAGE"
            ? { commissionRate: Number(rate) }
            : { fixedFee: Number(fee) }),
          startDate,
          endDate: endDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const party = parties.find((p) => p.id === partyId);
      toast.success("Agreement created", { description: party?.name ?? partyType });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New commission agreement</DialogTitle>
          <DialogDescription>
            Commission on transactions is computed from the applicable ACTIVE agreement of the
            listing owner.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="agreement-party-type">Party type</Label>
              <Select
                value={partyType}
                onValueChange={(v) => {
                  setPartyType(v as "SELLER" | "BUILDER");
                  setPartyId("");
                }}
              >
                <SelectTrigger id="agreement-party-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELLER">Seller</SelectItem>
                  <SelectItem value="BUILDER">Builder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agreement-party">Party</Label>
              <Select value={partyId} onValueChange={setPartyId} disabled={partiesLoading}>
                <SelectTrigger id="agreement-party" className="w-full">
                  <SelectValue
                    placeholder={partiesLoading ? "Loading…" : `Select ${partyType.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.builderProfile ? `${p.builderProfile.companyName} (${p.name})` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Commission structure</Label>
            <RadioGroup
              value={commissionType}
              onValueChange={(v) => setCommissionType(v as "PERCENTAGE" | "FIXED")}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                  commissionType === "PERCENTAGE" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <RadioGroupItem value="PERCENTAGE" className="mt-0.5" />
                <span className="text-sm">
                  <span className="font-medium">Percentage of sale</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    e.g. 1% of the transaction value
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                  commissionType === "FIXED" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <RadioGroupItem value="FIXED" className="mt-0.5" />
                <span className="text-sm">
                  <span className="font-medium">Fixed fee</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Flat amount per transaction
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          {commissionType === "PERCENTAGE" ? (
            <div className="grid gap-2">
              <Label htmlFor="agreement-rate">Commission rate (%)</Label>
              <Input
                id="agreement-rate"
                type="number"
                min={0}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 1.0"
              />
              <p className="text-xs text-muted-foreground">
                Enter as a percentage — 1.0 means 1% of the sale value.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="agreement-fee">Fixed fee (₹)</Label>
              <Input
                id="agreement-fee"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g. 50000"
              />
              <p className="text-xs text-muted-foreground">
                {fee && Number(fee) > 0 ? formatPriceFull(Number(fee)) : "Flat commission per transaction"}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="agreement-start">Start date</Label>
              <Input
                id="agreement-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agreement-end">End date (optional)</Label>
              <Input
                id="agreement-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agreement-notes">Notes (optional)</Label>
            <Textarea
              id="agreement-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Terms, exclusions, billing cycle…"
              rows={3}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Create agreement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminAgreements() {
  const [partyType, setPartyType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, error, refetch } = useApiData<{ data: AgreementDTO[] }>(
    () =>
      api(
        `/api/admin/agreements${qs({
          partyType: partyType !== "ALL" ? partyType : null,
          status: status !== "ALL" ? status : null,
        })}`
      ),
    [partyType, status]
  );

  const agreements = data?.data ?? [];

  async function patchStatus(agreement: AgreementDTO, nextStatus: string) {
    await runAction(
      () =>
        api(`/api/admin/agreements/${agreement.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }),
      nextStatus === "TERMINATED" ? "Agreement terminated" : "Agreement reactivated",
      { description: agreement.reference, onDone: refetch }
    );
  }

  return (
    <div>
      <TabIntro
        eyebrow="Finance"
        title="Listing agreements"
        description="Commission agreements with sellers and builders that drive transaction economics."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New agreement
          </Button>
        }
      />
      <AdminCard bodyClassName="">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <ChipBar
            value={partyType}
            onChange={setPartyType}
            options={[
              { value: "ALL", label: "All parties" },
              { value: "SELLER", label: "Sellers" },
              { value: "BUILDER", label: "Builders" },
            ]}
          />
          <ChipBar
            value={status}
            onChange={setStatus}
            options={[
              { value: "ALL", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "TERMINATED", label: "Terminated" },
              { value: "DRAFT", label: "Draft" },
            ]}
          />
        </div>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : agreements.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<FileText className="size-6" aria-hidden="true" />}
              title="No agreements found"
              description="Create a commission agreement with a seller or builder to enable transaction recording."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  New agreement
                </Button>
              }
            />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto gph-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.reference}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{a.partyName}</p>
                      <span
                        className={cn(
                          "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          a.partyType === "BUILDER"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-teal-100 text-teal-800"
                        )}
                      >
                        {a.partyType === "BUILDER" ? "Builder" : "Seller"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.commissionType === "PERCENTAGE" ? (
                        <span className="font-medium text-foreground">{a.commissionRate}% of sale</span>
                      ) : (
                        <span className="font-medium text-foreground">
                          {formatPriceFull(a.fixedFee)} fixed
                        </span>
                      )}
                      {a.notes ? (
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground" title={a.notes}>
                          {a.notes}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(a.startDate)} – {a.endDate ? formatDate(a.endDate) : "Ongoing"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {a.transactionCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => patchStatus(a, "TERMINATED")}
                        >
                          <Ban className="size-4" aria-hidden="true" />
                          Terminate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => patchStatus(a, "ACTIVE")}>
                          <RefreshCw className="size-4" aria-hidden="true" />
                          Reactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminCard>

      {createOpen ? (
        <NewAgreementDialog onClose={() => setCreateOpen(false)} onDone={refetch} />
      ) : null}
    </div>
  );
}
