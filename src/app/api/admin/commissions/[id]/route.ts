// ============================================================
// Admin — record a commission payment (ADMIN only)
// Payments are validated against the outstanding balance
// (amount - paidAmount) and applied atomically together with
// the ledger recompute (PENDING -> PARTIAL -> PAID).
// ============================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// ---------- include & DTO mapper (same shape as /commissions) ----------

const commissionInclude = {
  transaction: {
    select: {
      id: true,
      reference: true,
      saleValue: true,
      bookingDate: true,
      status: true,
      property: { select: { title: true, city: true } },
    },
  },
  payments: { orderBy: { paidOn: "desc" as const } },
} satisfies Prisma.CommissionInclude;

type CommissionRow = Prisma.CommissionGetPayload<{ include: typeof commissionInclude }>;

function toCommissionDTO(c: CommissionRow) {
  return {
    id: c.id,
    commissionType: c.commissionType,
    rate: c.rate,
    amount: c.amount,
    paidAmount: c.paidAmount,
    dueDate: c.dueDate?.toISOString() ?? null,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    transaction: {
      id: c.transaction.id,
      reference: c.transaction.reference,
      saleValue: c.transaction.saleValue,
      bookingDate: c.transaction.bookingDate.toISOString(),
      status: c.transaction.status,
      property: c.transaction.property,
    },
    payments: c.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paidOn: p.paidOn.toISOString(),
      method: p.method,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

const patchSchema = z.object({
  action: z.literal("record_payment"),
  amount: z.number().int().positive("Payment amount must be greater than zero"),
  paidOn: z.coerce.date().optional(),
  method: z.enum(["BANK_TRANSFER", "UPI", "CHEQUE", "CASH"]).optional(),
  reference: z.string().trim().max(120).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    const body = await parseBody(req, patchSchema);

    const commission = await db.commission.findUnique({ where: { id } });
    if (!commission) return fail("Commission record not found.", 404);

    const outstanding = commission.amount - commission.paidAmount;
    if (body.amount > outstanding) {
      return fail("Payment exceeds outstanding amount.", 400);
    }

    const method = body.method ?? "BANK_TRANSFER";
    const paidOn = body.paidOn ?? new Date();
    const newPaid = commission.paidAmount + body.amount;
    const newStatus = newPaid >= commission.amount ? "PAID" : "PARTIAL";

    const updated = await db.$transaction(async (tx) => {
      await tx.commissionPayment.create({
        data: {
          commissionId: commission.id,
          amount: body.amount,
          paidOn,
          method,
          reference: body.reference ?? null,
          recordedById: admin.id,
        },
      });
      return tx.commission.update({
        where: { id: commission.id },
        data: {
          paidAmount: { increment: body.amount },
          status: newStatus,
        },
        include: commissionInclude,
      });
    });

    await audit(
      admin.id,
      "COMMISSION_PAYMENT_RECORDED",
      "COMMISSION",
      commission.id,
      `₹${body.amount.toLocaleString("en-IN")} via ${method}${body.reference ? ` (${body.reference})` : ""} for transaction ${updated.transaction.reference} — ₹${newPaid.toLocaleString("en-IN")} of ₹${commission.amount.toLocaleString("en-IN")} received (${newStatus}).`
    );

    return ok({ commission: toCommissionDTO(updated) });
  });
}
