// ============================================================
// Admin — agreement status management (ADMIN only)
// Activate, terminate or return an agreement to draft.
// ============================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  partyType: z.enum(["SELLER", "BUILDER"]),
  status: z.enum(["ACTIVE", "TERMINATED", "DRAFT"]),
});

// ---------- includes & DTO mappers (same shape as /agreements) ----------

const sellerAgreementInclude = {
  seller: { select: { name: true } },
  _count: { select: { commissions: true } },
} satisfies Prisma.SellerAgreementInclude;

const builderAgreementInclude = {
  builder: { select: { companyName: true, user: { select: { name: true } } } },
  _count: { select: { commissions: true } },
} satisfies Prisma.BuilderAgreementInclude;

type SellerRow = Prisma.SellerAgreementGetPayload<{ include: typeof sellerAgreementInclude }>;
type BuilderRow = Prisma.BuilderAgreementGetPayload<{ include: typeof builderAgreementInclude }>;

function sellerToDTO(a: SellerRow) {
  return {
    id: a.id,
    reference: a.reference,
    partyType: "SELLER" as const,
    commissionType: a.commissionType,
    commissionRate: a.commissionRate,
    fixedFee: a.fixedFee,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate?.toISOString() ?? null,
    status: a.status,
    notes: a.notes,
    partyName: a.seller.name,
    partyId: a.sellerId,
    transactionCount: a._count.commissions,
  };
}

function builderToDTO(a: BuilderRow) {
  return {
    id: a.id,
    reference: a.reference,
    partyType: "BUILDER" as const,
    commissionType: a.commissionType,
    commissionRate: a.commissionRate,
    fixedFee: a.fixedFee,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate?.toISOString() ?? null,
    status: a.status,
    notes: a.notes,
    partyName: a.builder.companyName,
    partyId: a.builderId,
    transactionCount: a._count.commissions,
  };
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    const body = await parseBody(req, patchSchema);

    if (body.partyType === "SELLER") {
      const existing = await db.sellerAgreement.findUnique({ where: { id } });
      if (!existing) return fail("Agreement not found.", 404);

      const agreement = await db.sellerAgreement.update({
        where: { id },
        data: { status: body.status },
        include: sellerAgreementInclude,
      });

      await audit(
        admin.id,
        "AGREEMENT_STATUS_UPDATED",
        "AGREEMENT",
        agreement.id,
        `${agreement.reference}: ${existing.status} → ${body.status}`
      );
      return ok({ agreement: sellerToDTO(agreement) });
    }

    const existing = await db.builderAgreement.findUnique({ where: { id } });
    if (!existing) return fail("Agreement not found.", 404);

    const agreement = await db.builderAgreement.update({
      where: { id },
      data: { status: body.status },
      include: builderAgreementInclude,
    });

    await audit(
      admin.id,
      "AGREEMENT_STATUS_UPDATED",
      "AGREEMENT",
      agreement.id,
      `${agreement.reference}: ${existing.status} → ${body.status}`
    );
    return ok({ agreement: builderToDTO(agreement) });
  });
}
