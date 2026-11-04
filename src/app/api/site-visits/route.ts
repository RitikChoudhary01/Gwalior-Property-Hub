import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { visitInclude, toVisitDTO } from "@/lib/serializers";
import { notify, notifyAdmins } from "@/lib/notifications";
import { VISIT_TIME_SLOTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ---------------- POST: request a visit ----------------

const createSchema = z.object({
  propertyId: z.string().min(1),
  contactName: z.string().trim().min(2, "Please enter your name").max(80),
  contactPhone: z.string().trim().regex(/^[+\d][\d\s-]{7,14}$/, "Please enter a valid phone number"),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date"),
  preferredTime: z.string().refine((t) => VISIT_TIME_SLOTS.includes(t), "Select a valid time slot"),
  notes: z.string().trim().max(500).optional(),
  // team/admin scheduling on behalf of an assigned lead
  leadId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`visit:${ip}`, 10, 3600000)) {
      return fail("Too many visit requests. Please try again later.", 429);
    }

    const body = await parseBody(req, createSchema);
    const date = new Date(`${body.preferredDate}T00:00:00`);
    if (isNaN(date.getTime()) || date < new Date(new Date().toDateString())) {
      return fail("Preferred date must be today or later.", 422);
    }

    const user = await getSessionUser();

    // ---- team / admin scheduling a visit for an assigned lead ----
    if (body.leadId) {
      if (!user || (user.role !== "TEAM" && user.role !== "ADMIN")) {
        return fail("Not allowed.", 403);
      }
      const lead = await db.lead.findUnique({
        where: { id: body.leadId },
        include: { property: { select: { id: true, title: true, slug: true } } },
      });
      if (!lead) return fail("Lead not found.", 404);
      if (user.role === "TEAM" && lead.assignedToId !== user.id) {
        return fail("You can only schedule visits for leads assigned to you.", 403);
      }
      if (lead.property.id !== body.propertyId) {
        return fail("This lead is not for the selected property.", 422);
      }

      const visit = await db.siteVisit.create({
        data: {
          propertyId: lead.propertyId,
          buyerId: lead.buyerId,
          leadId: lead.id,
          preferredDate: date,
          preferredTime: body.preferredTime,
          contactName: body.contactName || lead.name,
          contactPhone: body.contactPhone || lead.phone,
          notes: body.notes ?? null,
          status: "CONFIRMED", // arranged directly with the buyer
          // the team member who schedules the visit coordinates it
          assignedToId: user.role === "TEAM" ? user.id : lead.assignedToId,
        },
        include: visitInclude,
      });

      await db.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          type: "VISIT" as const,
          note: `Site visit scheduled for ${body.preferredDate} at ${body.preferredTime} with ${visit.contactName}.`,
        },
      });
      await db.lead.update({
        where: { id: lead.id },
        data: { status: "SITE_VISIT_SCHEDULED", lastContactedAt: new Date() },
      });
      if (lead.buyerId) {
        await notify({
          userId: lead.buyerId,
          title: "Site visit scheduled",
          message: `A Gwalior Property Hub advisor scheduled your visit to "${lead.property.title}" on ${body.preferredDate} at ${body.preferredTime}.`,
          type: "VISIT",
          link: "#/dashboard?tab=visits",
        });
      }

      return ok({ id: visit.id }, 201);
    }

    // ---- public / buyer visit request ----
    const property = await db.property.findUnique({
      where: { id: body.propertyId },
      include: { seller: true, builder: true },
    });
    if (!property || property.status !== "PUBLISHED") {
      return fail("This property is not accepting visit requests.", 404);
    }

    const buyerId = user?.role === "BUYER" ? user.id : null;

    // link to an existing lead by phone, if any
    const existingLead = await db.lead.findFirst({
      where: { propertyId: property.id, phone: body.contactPhone },
      orderBy: { createdAt: "desc" },
    });

    const visit = await db.siteVisit.create({
      data: {
        propertyId: property.id,
        buyerId,
        leadId: existingLead?.id ?? null,
        preferredDate: date,
        preferredTime: body.preferredTime,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        notes: body.notes ?? null,
        status: "REQUESTED",
      },
      include: visitInclude,
    });

    // owner = individual seller, or the builder behind the project
    // when the unit has no individual seller attached
    const ownerUserId = property.sellerId ?? property.builder?.userId ?? null;
    const ownerLine = `${body.contactName} requested a visit to "${property.title}" on ${body.preferredDate} at ${body.preferredTime}.`;
    await notifyAdmins({
      title: "Site visit requested",
      message: ownerLine,
      type: "VISIT",
      link: "#/dashboard?tab=visits",
    });
    if (ownerUserId) {
      await notify({
        userId: ownerUserId,
        title: "Site visit requested",
        message: ownerLine,
        type: "VISIT",
        link: "#/dashboard?tab=visits",
      });
    }
    if (buyerId) {
      await notify({
        userId: buyerId,
        title: "Visit request received",
        message: `We received your request to visit "${property.title}". You'll get a confirmation shortly.`,
        type: "VISIT",
        link: "#/dashboard?tab=visits",
      });
    }

    return ok({ id: visit.id }, 201);
  });
}

// ---------------- GET: role-scoped list ----------------

export async function GET(req: Request) {
  return handle(async () => {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20)));
    const status = sp.get("status");

    const user = await getSessionUser();
    if (!user) return fail("Sign in to view site visits.", 401);

    const where: Prisma.SiteVisitWhereInput = {};
    if (status) where.status = status;

    if (user.role === "ADMIN") {
      // all
    } else if (user.role === "TEAM") {
      // team members coordinate visits for their assigned leads AND
      // visits explicitly assigned to them
      where.OR = [{ lead: { assignedToId: user.id } }, { assignedToId: user.id }];
    } else if (user.role === "BUYER") {
      where.buyerId = user.id;
    } else if (user.role === "SELLER") {
      where.property = { sellerId: user.id };
    } else if (user.role === "BUILDER") {
      where.property = { builderId: user.builderProfile?.id ?? "none" };
    }

    const [total, visits] = await Promise.all([
      db.siteVisit.count({ where }),
      db.siteVisit.findMany({
        where,
        include: visitInclude,
        orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return ok({
      data: visits.map(toVisitDTO),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  });
}
