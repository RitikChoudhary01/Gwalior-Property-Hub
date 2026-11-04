import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { propertyDetailInclude, propertyListInclude, toDetail, toCard } from "@/lib/serializers";
import { getLocalitySnapshot } from "@/lib/insights";
import { notify, notifyAdmins } from "@/lib/notifications";
import { PROPERTY_TYPES, FURNISHINGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function findProperty(idOrSlug: string) {
  return db.property.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: propertyDetailInclude,
  });
}

// ---------------- GET: detail ----------------

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const property = await findProperty(id);
    if (!property) return fail("Property not found.", 404);

    const user = await getSessionUser();
    const isOwner = user?.id === property.sellerId || (user?.builderProfile && property.builderId === user.builderProfile.id);
    const isAdmin = user?.role === "ADMIN";

    if (property.status !== "PUBLISHED" && !isOwner && !isAdmin) {
      return fail("This listing is not publicly available.", 404);
    }

    // increment views (skip when the owner views their own listing)
    if (!isOwner) {
      await db.property.update({ where: { id: property.id }, data: { views: { increment: 1 } } }).catch(() => undefined);
    }

    const similar = await db.property.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: property.id },
        OR: [{ city: property.city, type: property.type }, { city: property.city }],
      },
      include: propertyListInclude,
      orderBy: [{ featured: "desc" }, { views: "desc" }],
      take: 3,
    });

    const dto = toDetail({ ...property, views: property.views + (isOwner ? 0 : 1) }, similar);

    // Live locality price context (public data — derived from other published
    // listings only, never exposes seller information).
    const localityInsights = await getLocalitySnapshot(property).catch(() => null);

    // hide seller contact for guests on draft previews is not needed (drafts blocked above)
    return ok({ ...dto, localityInsights });
  });
}

// ---------------- PATCH: update ----------------

const patchSchema = z.object({
  title: z.string().trim().min(10).max(120).optional(),
  description: z.string().trim().min(50).max(4000).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  price: z.number().int().min(500000).optional(),
  negotiable: z.boolean().optional(),
  city: z.string().trim().min(2).max(60).optional(),
  state: z.string().trim().min(2).max(60).optional(),
  locality: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(10).max(240).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  bhk: z.number().int().min(1).max(8).nullable().optional(),
  bathrooms: z.number().int().min(1).max(8).nullable().optional(),
  carpetArea: z.number().int().min(100).max(100000).nullable().optional(),
  builtUpArea: z.number().int().min(100).max(200000).nullable().optional(),
  plotArea: z.number().int().min(100).max(500000).nullable().optional(),
  furnishing: z.enum(FURNISHINGS).nullable().optional(),
  parking: z.number().int().min(0).max(10).optional(),
  floorInfo: z.string().trim().max(30).nullable().optional(),
  facing: z.string().trim().max(30).nullable().optional(),
  constructionStatus: z.enum(["READY_TO_MOVE", "UNDER_CONSTRUCTION", "NEW"]).optional(),
  possessionDate: z.string().trim().max(30).nullable().optional(),
  ageOfProperty: z.string().trim().max(30).nullable().optional(),
  reraNumber: z.string().trim().max(60).nullable().optional(),
  amenities: z.array(z.string().max(40)).max(25).optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), isMain: z.boolean().optional() })).max(15).optional(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "INACTIVE", "SOLD"]).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
  availability: z.enum(["AVAILABLE", "RESERVED", "SOLD"]).optional(),
  featured: z.boolean().optional(),
  // Listing verification (legal/document) — ADMIN only. Strictly separate
  // from listing approval: approving a listing does NOT verify ownership.
  verificationStatus: z.enum(["NONE", "REQUESTED", "VERIFIED", "REJECTED"]).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await requireUser();
    const property = await findProperty(id);
    if (!property) return fail("Property not found.", 404);

    const isOwner = user.id === property.sellerId || (!!user.builderProfile && property.builderId === user.builderProfile.id);
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) return fail("You can only manage your own listings.", 403);

    const body = await parseBody(req, patchSchema);

    const data: Record<string, unknown> = {};
    const simpleFields = [
      "title", "description", "type", "price", "negotiable", "city", "state", "locality", "address",
      "latitude", "longitude", "bhk", "bathrooms", "carpetArea", "builtUpArea", "plotArea",
      "furnishing", "parking", "floorInfo", "facing", "constructionStatus", "possessionDate",
      "ageOfProperty", "reraNumber",
    ];
    for (const f of simpleFields) {
      if (f in body) (data as Record<string, unknown>)[f] = (body as Record<string, unknown>)[f];
    }

    // admin-only status controls
    if (body.status === "PUBLISHED" || body.status === "REJECTED") {
      if (!isAdmin) return fail("Only administrators can approve or reject listings.", 403);
      data.status = body.status;
      if (body.rejectionReason) data.rejectionReason = body.rejectionReason;
    } else if (body.status === "DRAFT" || body.status === "PENDING" || body.status === "INACTIVE") {
      data.status = body.status;
      if (body.status !== "INACTIVE") data.rejectionReason = null;
    }

    if (body.availability) {
      if (!isOwner && !isAdmin) return fail("Not allowed.", 403);
      data.availability = body.availability;
      if (body.availability === "SOLD") {
        data.status = "SOLD";
      } else if (property.status === "SOLD") {
        data.status = "PUBLISHED";
      }
    }

    if (typeof body.featured === "boolean") {
      if (!isAdmin) return fail("Only administrators can manage featured listings.", 403);
      data.featured = body.featured;
    }

    if (body.verificationStatus) {
      if (!isAdmin) {
        return fail("Only administrators can manage listing verification.", 403);
      }
      data.verificationStatus = body.verificationStatus;
    }

    // owner content edit on a PUBLISHED listing requires re-approval
    const contentChanged = simpleFields.some((f) => f in body) || body.images || body.amenities;
    if (contentChanged && property.status === "PUBLISHED" && !isAdmin && body.status !== "PUBLISHED") {
      data.status = "PENDING";
    }

    // replace amenities / images when provided
    let updated = property;
    await db.$transaction(async (tx) => {
      if (body.amenities) {
        await tx.propertyAmenity.deleteMany({ where: { propertyId: property.id } });
        await tx.propertyAmenity.createMany({
          data: body.amenities.map((name) => ({ propertyId: property.id, name })),
        });
      }
      if (body.images) {
        await tx.propertyImage.deleteMany({ where: { propertyId: property.id } });
        await tx.propertyImage.createMany({
          data: body.images.map((img, i) => ({
            propertyId: property.id,
            url: img.url,
            isMain: img.isMain ?? i === 0,
            sortOrder: i,
          })),
        });
      }
      if (Object.keys(data).length > 0) {
        updated = await tx.property.update({
          where: { id: property.id },
          data,
          include: propertyDetailInclude,
        });
      }
    });

    if (data.status === "PENDING" && !isAdmin) {
      await audit(user.id, "LISTING_RESUBMITTED", "PROPERTY", property.id, `"${property.title}"`);
      await notifyAdmins({
        title: "Listing submitted for review",
        message: `"${property.title}" was updated and resubmitted by ${user.name}.`,
        type: "LISTING",
        link: "#/dashboard?tab=moderation",
      });
    }

    if (body.status === "PUBLISHED" && isAdmin && property.status !== "PUBLISHED") {
      await audit(user.id, "LISTING_APPROVED", "PROPERTY", property.id, `"${property.title}"`);
      await notify({
        userId: property.sellerId,
        title: "Listing approved",
        message: `"${property.title}" is now live on Gwalior Property Hub.`,
        type: "LISTING",
        link: `#/properties/${property.slug}`,
      });
    }
    if (body.status === "REJECTED" && isAdmin) {
      await audit(user.id, "LISTING_REJECTED", "PROPERTY", property.id, body.rejectionReason ?? "");
      await notify({
        userId: property.sellerId,
        title: "Listing rejected",
        message: `"${property.title}" was rejected. ${body.rejectionReason ?? "Please review and resubmit."}`,
        type: "LISTING",
        link: "#/dashboard?tab=listings",
      });
    }
    if (body.verificationStatus && isAdmin) {
      const vs = body.verificationStatus;
      await audit(user.id, "LISTING_VERIFICATION_" + vs, "PROPERTY", property.id, `"${property.title}"`);
      const messages: Record<string, { title: string; message: string }> = {
        REQUESTED: {
          title: "Verification documents requested",
          message: `Please share ownership documents for "${property.title}" so Gwalior Property Hub can verify this listing.`,
        },
        VERIFIED: {
          title: "Listing verified",
          message: `"${property.title}" is now GPH Verified — ownership documents reviewed. Verified listings earn more buyer trust.`,
        },
        REJECTED: {
          title: "Verification could not be completed",
          message: `We could not verify the documents for "${property.title}". Our team will contact you with details.`,
        },
        NONE: {
          title: "Verification reset",
          message: `Verification state for "${property.title}" was reset.`,
        },
      };
      const m = messages[vs];
      if (m) {
        await notify({ userId: property.sellerId, ...m, type: "LISTING", link: "#/dashboard?tab=listings" });
      }
    }
    if (contentChanged && data.status === "PENDING" && !isAdmin && property.status === "PUBLISHED") {
      await notifyAdmins({
        title: "Edited listing needs re-approval",
        message: `"${property.title}" was edited by the owner and is pending review.`,
        type: "LISTING",
        link: "#/dashboard?tab=properties",
      });
    }

    const similar = await db.property.findMany({
      where: { status: "PUBLISHED", id: { not: property.id }, city: property.city },
      include: propertyListInclude,
      take: 3,
    });
    const localityInsights = await getLocalitySnapshot(updated).catch(() => null);

    return ok({ property: toDetail(updated, similar, localityInsights) });
  });
}

// ---------------- DELETE ----------------

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await requireUser();
    const property = await findProperty(id);
    if (!property) return fail("Property not found.", 404);

    const isOwner = user.id === property.sellerId || (!!user.builderProfile && property.builderId === user.builderProfile.id);
    if (!isOwner && user.role !== "ADMIN") return fail("You can only delete your own listings.", 403);

    await db.property.delete({ where: { id: property.id } });
    await audit(user.id, "LISTING_DELETED", "PROPERTY", property.id, `"${property.title}"`);

    return ok({ ok: true });
  });
}
