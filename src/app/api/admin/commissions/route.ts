// ============================================================
// Admin — commission ledger (ADMIN only)
// All commission records with payment history, filterable
// by settlement status (PENDING / PARTIAL / PAID).
// ============================================================

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------- include & DTO mapper (same shape as /commissions/[id]) ----------

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

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser(["ADMIN"]);

    const status = new URL(req.url).searchParams.get("status");
    const where: Prisma.CommissionWhereInput = {};
    if (status) where.status = status;

    const commissions = await db.commission.findMany({
      where,
      include: commissionInclude,
      orderBy: { createdAt: "desc" },
    });

    return ok({ data: commissions.map(toCommissionDTO) });
  });
}
