// ============================================================
// Admin — transaction lifecycle (ADMIN only)
// Complete, reconfirm or cancel a transaction. Cancelling
// atomically reverses the commission (payments cascade),
// reopens the listing and moves the lead to LOST.
// ============================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// ---------- shared include & DTO mapper (same shape as /transactions) ----------

const transactionInclude = {
  property: { select: { id: true, title: true, city: true, locality: true } },
  lead: { select: { id: true, reference: true, name: true } },
  buyer: { select: { id: true, name: true } },
  commission: {
    select: { id: true, amount: true, paidAmount: true, status: true, commissionType: true, rate: true },
  },
} satisfies Prisma.TransactionInclude;

type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

function toTransactionDTO(t: TransactionRow) {
  return {
    id: t.id,
    reference: t.reference,
    saleValue: t.saleValue,
    bookingDate: t.bookingDate.toISOString(),
    agreementRef: t.agreementRef,
    status: t.status,
    completionDate: t.completionDate?.toISOString() ?? null,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    property: t.property,
    lead: t.lead,
    buyer: t.buyer,
    commission: t.commission,
  };
}

const patchSchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED", "CONFIRMED"]),
  completionDate: z.coerce.date().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    const body = await parseBody(req, patchSchema);

    const existing = await db.transaction.findUnique({ where: { id }, include: transactionInclude });
    if (!existing) return fail("Transaction not found.", 404);
    if (existing.status === "CANCELLED") {
      return fail("This transaction has already been cancelled.", 409);
    }

    // listing owner(s): the seller user and, for builder listings, the builder's user
    const ownerIds = new Set<string>();
    if (existing.sellerId) ownerIds.add(existing.sellerId);
    if (existing.builderId) {
      const builder = await db.builder.findUnique({
        where: { id: existing.builderId },
        select: { userId: true },
      });
      if (builder) ownerIds.add(builder.userId);
    }

    if (body.status === "CANCELLED") {
      const updated = await db.$transaction(async (tx) => {
        // reverse the commission first — its payments cascade-delete with it
        if (existing.commission) {
          await tx.commission.deleteMany({ where: { id: existing.commission.id } });
        }
        if (existing.lead) {
          await tx.lead.update({
            where: { id: existing.lead.id },
            data: {
              status: "LOST",
              activities: {
                create: {
                  type: "STATUS_CHANGE",
                  note: `Transaction ${existing.reference} cancelled — listing returned to market.`,
                  userId: admin.id,
                },
              },
            },
          });
        }
        await tx.property.update({
          where: { id: existing.propertyId },
          data: { availability: "AVAILABLE", status: "PUBLISHED" },
        });
        return tx.transaction.update({
          where: { id: existing.id },
          data: { status: "CANCELLED" },
          include: transactionInclude,
        });
      });

      await audit(
        admin.id,
        "TRANSACTION_CANCELLED",
        "TRANSACTION",
        existing.id,
        `${existing.reference} cancelled — listing "${existing.property.title}" returned to market.`
      );
      if (existing.commission) {
        await audit(
          admin.id,
          "COMMISSION_REVERSED",
          "COMMISSION",
          existing.commission.id,
          `Commission of ₹${existing.commission.amount.toLocaleString("en-IN")} (₹${existing.commission.paidAmount.toLocaleString("en-IN")} already received) reversed for ${existing.reference}.`
        );
      }
      await Promise.all(
        [...ownerIds].map((userId) =>
          notify({
            userId,
            title: "Transaction cancelled",
            message: `Transaction ${existing.reference} for "${existing.property.title}" was cancelled. The listing is available again.`,
            type: "TRANSACTION",
            link: "#/dashboard",
          })
        )
      );
      return ok({ transaction: toTransactionDTO(updated) });
    }

    const data: Prisma.TransactionUpdateInput = { status: body.status };
    if (body.status === "COMPLETED") {
      data.completionDate = body.completionDate ?? new Date();
    }

    const updated = await db.transaction.update({
      where: { id: existing.id },
      data,
      include: transactionInclude,
    });

    await audit(
      admin.id,
      body.status === "COMPLETED" ? "TRANSACTION_COMPLETED" : "TRANSACTION_STATUS_UPDATED",
      "TRANSACTION",
      existing.id,
      `${existing.reference}: ${existing.status} → ${body.status}`
    );
    await Promise.all(
      [...ownerIds].map((userId) =>
        notify({
          userId,
          title: "Transaction update",
          message:
            body.status === "COMPLETED"
              ? `Transaction ${existing.reference} for "${existing.property.title}" was marked completed.`
              : `Transaction ${existing.reference} for "${existing.property.title}" was reconfirmed.`,
          type: "TRANSACTION",
          link: "#/dashboard",
        })
      )
    );

    return ok({ transaction: toTransactionDTO(updated) });
  });
}
