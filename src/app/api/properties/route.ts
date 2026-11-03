import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";
import { propertyListInclude, toCard, toDetail, propertyDetailInclude } from "@/lib/serializers";
import { uniqueSlug } from "@/lib/slug";
import { PROPERTY_TYPES, FURNISHINGS, CONSTRUCTION_STATUSES, AMENITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ---------------- GET: list / search ----------------

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const sp = url.searchParams;
    const scope = sp.get("scope") ?? "public";
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(48, Math.max(1, Number(sp.get("pageSize") ?? 12)));
    const sort = sp.get("sort") ?? "recent";

    const where: Prisma.PropertyWhereInput = {};

    if (scope === "mine") {
      const user = await requireUser(["SELLER", "BUILDER", "ADMIN"]);
      where.OR = [{ sellerId: user.id }, ...(user.builderProfile ? [{ builderId: user.builderProfile.id }] : [])];
    } else if (scope === "admin") {
      await requireUser(["ADMIN"]);
      const status = sp.get("status");
      if (status) where.status = status;
    } else {
      where.status = "PUBLISHED";
    }

    // filters
    const city = sp.get("city");
    const state = sp.get("state");
    const locality = sp.get("locality");
    const type = sp.get("type");
    const minPrice = sp.get("minPrice");
    const maxPrice = sp.get("maxPrice");
    const bhk = sp.get("bhk");
    const bathrooms = sp.get("bathrooms");
    const furnishing = sp.get("furnishing");
    const constructionStatus = sp.get("constructionStatus");
    const projectId = sp.get("projectId");
    const q = sp.get("q");

    if (city) where.city = city;
    if (state) where.state = state;
    if (locality) where.locality = locality;
    if (type) where.type = type;
    if (projectId) where.projectId = projectId;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (bhk) where.bhk = { in: bhk.split(",").map(Number).filter((n) => !isNaN(n)) };
    if (bathrooms) where.bathrooms = { gte: Number(bathrooms) };
    if (furnishing) where.furnishing = furnishing;
    if (constructionStatus) where.constructionStatus = constructionStatus;
    if (sp.get("verified") === "1") where.seller = { isVerified: true };
    if (sp.get("featured") === "1") where.featured = true;
    if (sp.get("sold") !== "1") {
      // hide sold by default in public scope only
      if (scope === "public" && sp.get("includeSold") !== "1") {
        // sold homes are still shown (with badge) — keep them; RESERVED hidden
      }
    }
    if (q) {
      where.OR = [
        ...(where.OR ?? []),
        { title: { contains: q } },
        { locality: { contains: q } },
        { city: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
      sort === "price_asc"
        ? [{ price: "asc" }]
        : sort === "price_desc"
          ? [{ price: "desc" }]
          : [{ createdAt: "desc" }];

    const [total, properties] = await Promise.all([
      db.property.count({ where }),
      db.property.findMany({
        where,
        include: propertyListInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return ok({
      data: properties.map(toCard),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  });
}

// ---------------- POST: create listing ----------------

const createSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters").max(120),
  description: z.string().trim().min(50, "Description must be at least 50 characters").max(4000),
  type: z.enum(PROPERTY_TYPES),
  price: z.number().int().min(500000, "Price must be at least ₹5,00,000"),
  negotiable: z.boolean().optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  locality: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(240),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  bhk: z.number().int().min(1).max(8).optional().nullable(),
  bathrooms: z.number().int().min(1).max(8).optional().nullable(),
  carpetArea: z.number().int().min(100).max(100000).optional().nullable(),
  builtUpArea: z.number().int().min(100).max(200000).optional().nullable(),
  plotArea: z.number().int().min(100).max(500000).optional().nullable(),
  furnishing: z.enum(FURNISHINGS).optional().nullable(),
  parking: z.number().int().min(0).max(10).optional(),
  floorInfo: z.string().trim().max(30).optional().nullable(),
  facing: z.string().trim().max(30).optional().nullable(),
  constructionStatus: z.enum(["READY_TO_MOVE", "UNDER_CONSTRUCTION", "NEW"]).optional(),
  possessionDate: z.string().trim().max(30).optional().nullable(),
  ageOfProperty: z.string().trim().max(30).optional().nullable(),
  reraNumber: z.string().trim().max(60).optional().nullable(),
  projectId: z.string().optional().nullable(),
  amenities: z.array(z.string().max(40)).max(25).optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), isMain: z.boolean().optional() })).max(15).optional(),
  draft: z.boolean().optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser(["SELLER", "BUILDER", "ADMIN"]);
    const body = await parseBody(req, createSchema);

    // builders may only list under their own company; admins may specify a builder
    let builderId: string | null = null;
    if (user.role === "BUILDER" && user.builderProfile) builderId = user.builderProfile.id;
    else if (user.role === "ADMIN" && body.projectId) {
      const project = await db.project.findUnique({ where: { id: body.projectId } });
      builderId = project?.builderId ?? null;
    }

    if (body.projectId) {
      const project = await db.project.findUnique({ where: { id: body.projectId } });
      if (!project) return fail("Selected project does not exist.", 422);
      if (user.role === "BUILDER" && project.builderId !== user.builderProfile?.id) {
        return fail("You can only add units to your own projects.", 403);
      }
    }

    const validAmenities = (body.amenities ?? []).filter((a) => (AMENITIES as readonly string[]).includes(a));

    const property = await db.property.create({
      data: {
        title: body.title,
        slug: uniqueSlug(body.title),
        description: body.description,
        type: body.type,
        price: body.price,
        negotiable: body.negotiable ?? false,
        city: body.city,
        state: body.state,
        locality: body.locality,
        address: body.address,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        bhk: body.bhk ?? null,
        bathrooms: body.bathrooms ?? null,
        carpetArea: body.carpetArea ?? null,
        builtUpArea: body.builtUpArea ?? null,
        plotArea: body.plotArea ?? null,
        furnishing: body.furnishing ?? null,
        parking: body.parking ?? 0,
        floorInfo: body.floorInfo ?? null,
        facing: body.facing ?? null,
        constructionStatus: body.constructionStatus ?? "READY_TO_MOVE",
        possessionDate: body.possessionDate ?? null,
        ageOfProperty: body.ageOfProperty ?? null,
        reraNumber: body.reraNumber ?? null,
        sellerId: user.id,
        builderId,
        projectId: body.projectId ?? null,
        status: body.draft ? "DRAFT" : "PENDING",
        images: {
          create: (body.images ?? []).map((img, i) => ({
            url: img.url,
            isMain: img.isMain ?? i === 0,
            sortOrder: i,
          })),
        },
        amenities: { create: validAmenities.map((name) => ({ name })) },
      },
      include: propertyDetailInclude,
    });

    // builders listing a project unit bump availability counters
    if (property.projectId) {
      await db.project.update({
        where: { id: property.projectId },
        data: { totalUnits: { increment: 1 }, availableUnits: { increment: 1 } },
      });
    }

    await audit(user.id, body.draft ? "LISTING_DRAFT_CREATED" : "LISTING_SUBMITTED", "PROPERTY", property.id, property.title);

    if (!body.draft) {
      await notifyAdmins({
        title: "Listing pending approval",
        message: `"${property.title}" (${property.locality}, ${property.city}) was submitted for review.`,
        type: "LISTING",
        link: "#/dashboard?tab=properties",
      });
    }

    return ok({ property: toDetail(property) }, 201);
  });
}
