// ============================================================
// Agreements — role-scoped "my commissions" view for SELLER and
// BUILDER accounts. Returns the signed-in party's own commission
// agreements, the commission obligations raised against them and
// a settlement summary. Every amount is computed server-side;
// the API never accepts client-supplied figures.
// ============================================================

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

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

export async function GET() {
  return handle(async () => {
    const user = await requireUser(["SELLER", "BUILDER"]);

    if (user.role === "SELLER") {
      const agreements = await db.sellerAgreement.findMany({
        where: { sellerId: user.id },
        orderBy: { createdAt: "desc" },
      });
      const commissions = await db.commission.findMany({
        where: { sellerAgreement: { sellerId: user.id } },
        include: commissionInclude,
        orderBy: { createdAt: "desc" },
      });

      return ok({
        partyType: "SELLER" as const,
        agreements: agreements.map((a) => ({
          id: a.id,
          reference: a.reference,
          commissionType: a.commissionType,
          commissionRate: a.commissionRate,
          fixedFee: a.fixedFee,
          startDate: a.startDate.toISOString(),
          endDate: a.endDate?.toISOString() ?? null,
          status: a.status,
          notes: a.notes,
        })),
        commissions: commissions.map(toCommissionDTO),
      });
    }

    // BUILDER — commissions flow through the builder profile
    const builderId = user.builderProfile?.id;
    if (!builderId) {
      return ok({ partyType: "BUILDER" as const, agreements: [], commissions: [] });
    }

    const agreements = await db.builderAgreement.findMany({
      where: { builderId },
      orderBy: { createdAt: "desc" },
    });
    const commissions = await db.commission.findMany({
      where: { builderAgreement: { builderId } },
      include: commissionInclude,
      orderBy: { createdAt: "desc" },
    });

    return ok({
      partyType: "BUILDER" as const,
      agreements: agreements.map((a) => ({
        id: a.id,
        reference: a.reference,
        commissionType: a.commissionType,
        commissionRate: a.commissionRate,
        fixedFee: a.fixedFee,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        status: a.status,
        notes: a.notes,
      })),
      commissions: commissions.map(toCommissionDTO),
    });
  });
}
