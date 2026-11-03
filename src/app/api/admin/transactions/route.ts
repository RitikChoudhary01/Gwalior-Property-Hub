// ============================================================
// Admin — transactions (ADMIN only)
// Recording a sale is the critical financial flow: the
// commission is computed SERVER-SIDE from the applicable
// ACTIVE agreement and the transaction + commission + lead +
// property updates are applied atomically.
// ============================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { transactionReference } from "@/lib/slug";

export const dynamic = "force-dynamic";

// ---------- shared include & DTO mapper ----------

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

// ---------------- GET: list transactions ----------------

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser(["ADMIN"]);

    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const q = sp.get("q");

    const where: Prisma.TransactionWhereInput = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { reference: { contains: q } },
        { property: { title: { contains: q } } },
        { lead: { reference: { contains: q } } },
        { lead: { name: { contains: q } } },
        { buyer: { name: { contains: q } } },
      ];
    }

    const transactions = await db.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: { bookingDate: "desc" },
    });

    return ok({ data: transactions.map(toTransactionDTO) });
  });
}

// ---------------- POST: record a transaction ----------------

const createSchema = z.object({
  leadId: z.string().min(1, "Select a lead"),
  saleValue: z.number().int().min(1000000, "Sale value must be at least ₹10,00,000"),
  bookingDate: z.coerce.date(),
  agreementRef: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const ELIGIBLE_LEAD_STATUSES = ["NEGOTIATION", "SITE_VISIT_COMPLETED", "BOOKING"];

export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const body = await parseBody(req, createSchema);

    const lead = await db.lead.findUnique({
      where: { id: body.leadId },
      include: {
        property: { select: { id: true, title: true, sellerId: true, builderId: true } },
      },
    });
    if (!lead) return fail("Lead not found.", 404);

    if (!(ELIGIBLE_LEAD_STATUSES as readonly string[]).includes(lead.status)) {
      return fail(
        `A transaction can only be recorded for a lead in negotiation, visit-completed or booking stage (current status: ${lead.status.replace(/_/g, " ").toLowerCase()}).`,
        409
      );
    }

    const existing = await db.transaction.findUnique({ where: { leadId: lead.id } });
    if (existing) return fail("A transaction has already been recorded for this lead.", 409);

    // applicable agreement: builder listing -> builder agreement, otherwise seller agreement
    const builderAgreement = lead.property.builderId
      ? await db.builderAgreement.findFirst({
          where: { builderId: lead.property.builderId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : null;
    const sellerAgreement = !lead.property.builderId
      ? await db.sellerAgreement.findFirst({
          where: { sellerId: lead.property.sellerId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : null;
    const agreement = builderAgreement ?? sellerAgreement;
    if (!agreement) {
      return fail("No active commission agreement for this seller/builder. Create an agreement first.", 409);
    }

    // commission is ALWAYS computed server-side from the agreement terms
    let commissionAmount: number;
    if (agreement.commissionType === "PERCENTAGE") {
      if (agreement.commissionRate === null || agreement.commissionRate === undefined) {
        return fail("The active agreement is missing its commission rate. Fix the agreement first.", 409);
      }
      commissionAmount = Math.round((body.saleValue * agreement.commissionRate) / 100);
    } else {
      if (!agreement.fixedFee) {
        return fail("The active agreement is missing its fixed fee. Fix the agreement first.", 409);
      }
      commissionAmount = agreement.fixedFee;
    }

    const reference = transactionReference();
    const saleFormatted = body.saleValue.toLocaleString("en-IN");
    const commissionFormatted = commissionAmount.toLocaleString("en-IN");

    const created = await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          reference,
          leadId: lead.id,
          propertyId: lead.property.id,
          buyerId: lead.buyerId,
          sellerId: lead.property.sellerId,
          builderId: lead.property.builderId,
          saleValue: body.saleValue,
          bookingDate: body.bookingDate,
          agreementRef: body.agreementRef ?? null,
          status: "CONFIRMED",
          notes: body.notes ?? null,
        },
      });

      await tx.commission.create({
        data: {
          transactionId: transaction.id,
          sellerAgreementId: sellerAgreement ? sellerAgreement.id : null,
          builderAgreementId: builderAgreement ? builderAgreement.id : null,
          commissionType: agreement.commissionType,
          rate: agreement.commissionType === "PERCENTAGE" ? agreement.commissionRate : null,
          amount: commissionAmount,
          dueDate: new Date(body.bookingDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          paidAmount: 0,
          status: "PENDING",
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: "CONVERTED",
          activities: {
            create: {
              type: "STATUS_CHANGE",
              note: `Transaction ${reference} recorded — sale value ₹${saleFormatted}.`,
              userId: admin.id,
            },
          },
        },
      });

      await tx.property.update({
        where: { id: lead.property.id },
        data: { availability: "SOLD", status: "SOLD" },
      });

      return transaction;
    });

    await audit(
      admin.id,
      "TRANSACTION_CREATED",
      "TRANSACTION",
      created.id,
      `${reference} for "${lead.property.title}" — sale ₹${saleFormatted}, commission ₹${commissionFormatted} (${agreement.commissionType === "PERCENTAGE" ? `${agreement.commissionRate}% per ${agreement.reference}` : `fixed fee per ${agreement.reference}`})`
    );

    // notify the assigned agent, the listing owner and the buyer (when known)
    const recipients = new Set<string>();
    if (lead.assignedToId) recipients.add(lead.assignedToId);
    recipients.add(lead.property.sellerId);
    if (lead.buyerId) recipients.add(lead.buyerId);
    await Promise.all(
      [...recipients].map((userId) =>
        notify({
          userId,
          title: "Transaction recorded",
          message: `Transaction recorded for ${lead.property.title}.`,
          type: "TRANSACTION",
          link: "#/dashboard",
        })
      )
    );

    const full = await db.transaction.findUnique({ where: { id: created.id }, include: transactionInclude });
    return ok({ transaction: full ? toTransactionDTO(full) : null }, 201);
  });
}
