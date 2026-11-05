import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { requirementInclude, toRequirementDTO, matchPropertyInclude, toMatchPropertyDTO } from "@/lib/serializers";
import { requirementReference } from "@/lib/slug";
import { matchProperties, type MatchableProperty, type PropertyMatch } from "@/lib/matching";
import { notifyAdmins } from "@/lib/notifications";
import { CITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const CITY_NAMES = CITIES.map((c) => c.city);

// ---------------- Shared matching helper ----------------

/** Loads published inventory for the given cities and scores it against a requirement. */
async function findMatches(
  criteria: { city: string; localities?: string | null; propertyType?: string | null; bhk?: number | null; budgetMin?: number | null; budgetMax?: number | null },
  limit = 12
): Promise<{ matches: (ReturnType<typeof toMatchPropertyDTO> & { score: number; reasons: string[] })[] }> {
  const properties = await db.property.findMany({
    where: { status: "PUBLISHED", city: criteria.city, availability: "AVAILABLE" },
    include: matchPropertyInclude,
  });

  const matchable: MatchableProperty[] = properties.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    city: p.city,
    locality: p.locality,
    type: p.type,
    bhk: p.bhk,
    price: p.price,
    reraNumber: p.reraNumber,
    verificationStatus: p.verificationStatus,
    imageCount: p.images.length,
  }));

  const byId = new Map(properties.map((p) => [p.id, p]));
  const scored: PropertyMatch[] = matchProperties(criteria, matchable, limit);

  return {
    matches: scored
      .map(({ property, score, reasons }) => {
        const row = byId.get(property.id);
        if (!row) return null;
        return { ...toMatchPropertyDTO(row), score, reasons };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null),
  };
}

// ---------------- POST: public "Post Your Requirement" ----------------

const createSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(80),
    phone: z.string().trim().regex(/^[+\d][\d\s-]{7,14}$/, "Please enter a valid phone number"),
    email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
    purpose: z.enum(["BUY", "RENT"]).default("BUY"),
    city: z.string().trim().min(2, "Select or enter a valid city").max(60),
    localities: z.string().trim().max(300).optional(),
    propertyType: z.string().trim().min(1).default("Any"),
    bhk: z.coerce.number().int().min(1).max(10).optional(),
    budgetMin: z.coerce.number().int().min(500000).max(500000000).optional(),
    budgetMax: z.coerce.number().int().min(500000).max(500000000).optional(),
    notes: z.string().trim().max(1000).optional(),
    consent: z.literal(true, { message: "Consent to be contacted is required" }),
  })
  .refine((d) => !d.budgetMin || !d.budgetMax || d.budgetMin <= d.budgetMax, {
    message: "Minimum budget cannot exceed maximum budget",
    path: ["budgetMin"],
  });

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`requirement:${ip}`, 6, 3600000)) {
      return fail("Too many requirement posts from this device. Please try again later.", 429);
    }

    const body = await parseBody(req, createSchema);

    // Duplicate guard: same phone + city within 30 days returns the original
    const dupWindow = new Date(Date.now() - 30 * 86400000);
    const duplicate = await db.requirement.findFirst({
      where: { phone: body.phone, city: body.city, createdAt: { gte: dupWindow } },
      include: requirementInclude,
    });
    if (duplicate) {
      const { matches } = await findMatches(duplicate);
      return ok({ requirement: toRequirementDTO(duplicate), matches, duplicate: true });
    }

    const user = await getSessionUser();

    let reference = requirementReference();
    for (let i = 0; i < 5; i++) {
      const clash = await db.requirement.findUnique({ where: { reference } });
      if (!clash) break;
      reference = requirementReference();
    }

    const requirement = await db.requirement.create({
      data: {
        reference,
        ...(user && user.role === "BUYER" ? { buyerId: user.id } : {}),
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        purpose: body.purpose,
        city: body.city,
        localities: body.localities || null,
        propertyType: body.propertyType,
        bhk: body.bhk ?? null,
        budgetMin: body.budgetMin ?? null,
        budgetMax: body.budgetMax ?? null,
        notes: body.notes || null,
        source: "Website",
      },
      include: requirementInclude,
    });

    const { matches } = await findMatches(requirement);

    // A requirement with live inventory matches is immediately actionable —
    // surface it as MATCHED so the team prioritises it.
    if (matches.length > 0) {
      await db.requirement.update({ where: { id: requirement.id }, data: { status: "MATCHED" } });
      requirement.status = "MATCHED";
    }

    await notifyAdmins({
      title: "New buyer requirement",
      message: `${body.name} is looking for a ${body.propertyType !== "Any" ? `${body.propertyType} ` : ""}home in ${body.city}${body.budgetMax ? ` (up to ₹${Math.round(body.budgetMax / 100000)} L)` : ""}${matches.length ? ` — ${matches.length} matching ${matches.length === 1 ? "listing" : "listings"}` : " — no exact match yet"}.`,
      type: "ENQUIRY",
      link: "/dashboard?tab=requirements",
    });

    return ok({ requirement: toRequirementDTO(requirement), matches }, 201);
  });
}

// ---------------- GET: role-scoped list ----------------

const listSchema = z.object({
  status: z.string().optional(),
  city: z.string().optional(),
  assignedTo: z.string().optional(), // admin filter
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) return fail("Sign in required.", 401);

    // Buyers see their own requirements; team members see assigned ones;
    // admins see everything. Sellers and builders have no access.
    if (user.role !== "BUYER" && user.role !== "TEAM" && user.role !== "ADMIN") {
      return fail("Not allowed.", 403);
    }

    const url = new URL(req.url);
    const params = listSchema.parse(Object.fromEntries(url.searchParams.entries()));

    const where: Prisma.RequirementWhereInput = {};
    if (user.role === "BUYER") where.buyerId = user.id;
    if (user.role === "TEAM") where.assignedToId = user.id;
    if (params.status) where.status = params.status;
    if (params.city) where.city = params.city;
    if (user.role === "ADMIN" && params.assignedTo) where.assignedToId = params.assignedTo;

    const [total, rows] = await Promise.all([
      db.requirement.count({ where }),
      db.requirement.findMany({
        where,
        include: requirementInclude,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    // Match counts are computed from the same engine the buyer sees —
    // one inventory query per distinct city keeps this cheap.
    const cities = [...new Set(rows.map((r) => r.city))];
    const inventory = cities.length
      ? await db.property.findMany({
          where: { status: "PUBLISHED", availability: "AVAILABLE", city: { in: cities } },
          select: {
            id: true, slug: true, title: true, city: true, locality: true, type: true,
            bhk: true, price: true, reraNumber: true, verificationStatus: true,
            images: { select: { url: true, isMain: true } },
          },
        })
      : [];

    const matchable: MatchableProperty[] = inventory.map((p) => ({
      id: p.id, slug: p.slug, title: p.title, city: p.city, locality: p.locality,
      type: p.type, bhk: p.bhk, price: p.price, reraNumber: p.reraNumber,
      verificationStatus: p.verificationStatus, imageCount: p.images.length,
    }));

    const items = rows.map((r) => {
      const matches = matchProperties(r, matchable, 100);
      return { ...toRequirementDTO(r), matchCount: matches.length, topMatch: matches[0]?.property.title ?? null };
    });

    return ok({ items, total, page: params.page, pageSize: params.pageSize });
  });
}
