import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { leadInclude, toLeadDTO } from "@/lib/serializers";
import { leadReference } from "@/lib/slug";
import { notify, notifyAdmins, sendEmail } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// ---------------- POST: public enquiry → lead ----------------

const createSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{7,14}$/, "Please enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
  budget: z.number().int().min(500000).max(500000000).optional(),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal(true, { message: "Consent to be contacted is required" }),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`lead:${ip}`, 15, 3600000)) {
      return fail("Too many enquiries from this device. Please try again later.", 429);
    }

    const body = await parseBody(req, createSchema);
    const property = await db.property.findUnique({
      where: { id: body.propertyId },
      include: { seller: true, builder: true },
    });
    if (!property || property.status !== "PUBLISHED") {
      return fail("This property is not accepting enquiries.", 404);
    }

    // duplicate prevention: same phone on same property within 30 days
    const dupWindow = new Date(Date.now() - 30 * 86400000);
    const duplicate = await db.lead.findFirst({
      where: { propertyId: property.id, phone: body.phone, createdAt: { gte: dupWindow } },
    });
    if (duplicate) {
      return ok({ reference: duplicate.reference, duplicate: true });
    }

    const user = await getSessionUser();

    let reference = leadReference();
    for (let i = 0; i < 5; i++) {
      const clash = await db.lead.findUnique({ where: { reference } });
      if (!clash) break;
      reference = leadReference();
    }

    const lead = await db.lead.create({
      data: {
        reference,
        propertyId: property.id,
        buyerId: user?.role === "BUYER" ? user.id : null,
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        budget: body.budget ?? null,
        message: body.message ?? null,
        status: "NEW",
        source: "Website",
        consent: true,
        activities: {
          create: {
            type: "SYSTEM",
            note: `Enquiry received via website for "${property.title}" (${property.locality}, ${property.city}).`,
          },
        },
      },
      include: leadInclude,
    });

    // notifications: admins + listing owner (seller, or the builder
    // behind the project when the unit has no individual seller)
    const ownerUserId = property.sellerId ?? property.builder?.userId ?? null;
    await notifyAdmins({
      title: "New enquiry received",
      message: `${lead.name} enquired about "${property.title}" (${property.locality}, ${property.city}). Ref ${lead.reference}.`,
      type: "ENQUIRY",
      link: "#/dashboard?tab=leads",
    });
    if (ownerUserId) {
      await notify({
        userId: ownerUserId,
        title: "New enquiry on your listing",
        message: `${lead.name} enquired about "${property.title}". Ref ${lead.reference}.`,
        type: "ENQUIRY",
        link: "#/dashboard?tab=enquiries",
      });
    }
    // external channels (skipped gracefully when not configured)
    if (property.seller?.email) {
      await sendEmail(property.seller.email, `New enquiry: ${property.title}`, `You have a new enquiry (ref ${lead.reference}) from ${lead.name}.`);
    }

    return ok({ reference: lead.reference }, 201);
  });
}

// ---------------- GET: role-scoped list ----------------

export async function GET(req: Request) {
  return handle(async () => {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20)));
    const status = sp.get("status");
    const q = sp.get("q");
    const propertyId = sp.get("propertyId");

    const user = await getSessionUser();
    if (!user) return fail("Sign in to view enquiries.", 401);

    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { reference: { contains: q } },
        { property: { title: { contains: q } } },
      ];
    }

    if (user.role === "ADMIN") {
      if (sp.get("assignedTo") === "me") where.assignedToId = user.id;
    } else if (user.role === "BUYER") {
      where.buyerId = user.id;
    } else if (user.role === "SELLER") {
      where.property = { sellerId: user.id };
    } else if (user.role === "BUILDER") {
      where.property = { builderId: user.builderProfile?.id ?? "none" };
    }

    const [total, leads] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return ok({
      data: leads.map(toLeadDTO),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  });
}
