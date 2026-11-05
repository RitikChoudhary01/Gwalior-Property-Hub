// ============================================================
// Admin — commission agreements (ADMIN only)
// List seller + builder agreements, or create a new ACTIVE
// agreement. Commission terms are validated server-side
// (percentage 0 < rate <= 10, fixed fee >= ₹1,000).
// ============================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { memoryCache } from "@/lib/cache";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { agreementReference } from "@/lib/slug";

export const dynamic = "force-dynamic";

// ---------- shared includes & DTO mappers ----------

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

// ---------------- GET: list agreements ----------------

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser(["ADMIN"]);

    const sp = new URL(req.url).searchParams;
    const cacheKey = `admin:agreements:${sp.toString()}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return ok(cached);

    const partyType = sp.get("partyType");
    const status = sp.get("status");

    const [sellerAgreements, builderAgreements] = await Promise.all([
      partyType === "BUILDER"
        ? Promise.resolve([] as SellerRow[])
        : db.sellerAgreement.findMany({
            where: status ? { status } : {},
            include: sellerAgreementInclude,
            orderBy: { createdAt: "desc" },
          }),
      partyType === "SELLER"
        ? Promise.resolve([] as BuilderRow[])
        : db.builderAgreement.findMany({
            where: status ? { status } : {},
            include: builderAgreementInclude,
            orderBy: { createdAt: "desc" },
          }),
    ]);

    const merged = [
      ...sellerAgreements.map((a) => ({ dto: sellerToDTO(a), createdAt: a.createdAt.getTime() })),
      ...builderAgreements.map((a) => ({ dto: builderToDTO(a), createdAt: a.createdAt.getTime() })),
    ].sort((x, y) => y.createdAt - x.createdAt);

    const result = { data: merged.map((m) => m.dto) };
    memoryCache.set(cacheKey, result, 30_000);
    return ok(result);
  });
}

// ---------------- POST: create agreement ----------------

const createSchema = z.object({
  partyType: z.enum(["SELLER", "BUILDER"]),
  partyId: z.string().min(1, "Select a party"),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]),
  commissionRate: z.number().positive().max(10, "Commission rate cannot exceed 10%").optional(),
  fixedFee: z.number().int().min(1000, "Fixed fee must be at least ₹1,000").optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const admin = await requireUser(["ADMIN"]);
    const body = await parseBody(req, createSchema);

    // cross-field rules: each agreement type requires its own terms
    if (body.commissionType === "PERCENTAGE" && (body.commissionRate === undefined || body.commissionRate <= 0 || body.commissionRate > 10)) {
      return fail("Percentage agreements require a commission rate above 0 and at most 10.", 422);
    }
    if (body.commissionType === "FIXED" && (body.fixedFee === undefined || body.fixedFee < 1000)) {
      return fail("Fixed-fee agreements require a fee of at least ₹1,000.", 422);
    }
    if (body.endDate && body.endDate < body.startDate) {
      return fail("End date cannot be before the start date.", 422);
    }

    const terms =
      body.commissionType === "PERCENTAGE"
        ? `${body.commissionRate}% of sale value`
        : `flat ₹${(body.fixedFee ?? 0).toLocaleString("en-IN")} per sale`;

    const shared = {
      commissionType: body.commissionType,
      commissionRate:
        body.commissionType === "PERCENTAGE" && body.commissionRate !== undefined ? body.commissionRate : null,
      fixedFee: body.commissionType === "FIXED" && body.fixedFee !== undefined ? body.fixedFee : null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      notes: body.notes ?? null,
      status: "ACTIVE",
    };

    if (body.partyType === "SELLER") {
      const seller = await db.user.findUnique({ where: { id: body.partyId } });
      if (!seller || seller.role !== "SELLER") return fail("Seller not found.", 404);

      const agreement = await db.sellerAgreement.create({
        data: { ...shared, reference: agreementReference("SLR"), sellerId: seller.id },
        include: sellerAgreementInclude,
      });

      await audit(
        admin.id,
        "AGREEMENT_CREATED",
        "AGREEMENT",
        agreement.id,
        `Seller agreement ${agreement.reference} with ${seller.name} — ${terms}`
      );
      await notify({
        userId: seller.id,
        title: "Commission agreement activated",
        message: `Your commission agreement ${agreement.reference} is now active (${terms}).`,
        type: "TRANSACTION",
        link: "#/dashboard",
      });

      return ok({ agreement: sellerToDTO(agreement) }, 201);
    }

    const builder = await db.builder.findUnique({
      where: { id: body.partyId },
      include: { user: { select: { id: true } } },
    });
    if (!builder) return fail("Builder not found.", 404);

    const agreement = await db.builderAgreement.create({
      data: { ...shared, reference: agreementReference("BLD"), builderId: builder.id },
      include: builderAgreementInclude,
    });

    await audit(
      admin.id,
      "AGREEMENT_CREATED",
      "AGREEMENT",
      agreement.id,
      `Builder agreement ${agreement.reference} with ${builder.companyName} — ${terms}`
    );
    await notify({
      userId: builder.user.id,
      title: "Commission agreement activated",
      message: `Your commission agreement ${agreement.reference} is now active (${terms}).`,
      type: "TRANSACTION",
      link: "#/dashboard",
    });

    return ok({ agreement: builderToDTO(agreement) }, 201);
  });
}
