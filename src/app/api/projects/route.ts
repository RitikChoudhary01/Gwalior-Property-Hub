import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";
import { projectListInclude, projectToCard } from "@/lib/serializers";
import { uniqueSlug } from "@/lib/slug";
import { PROJECT_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ---------------- GET: list ----------------

export async function GET(req: Request) {
  return handle(async () => {
    const sp = new URL(req.url).searchParams;
    const scope = sp.get("scope") ?? "public";
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(48, Math.max(1, Number(sp.get("pageSize") ?? 12)));

    const where: Prisma.ProjectWhereInput = {};
    if (scope === "mine") {
      const user = await requireUser(["BUILDER", "ADMIN"]);
      if (user.role === "BUILDER" && user.builderProfile) where.builderId = user.builderProfile.id;
    } else if (scope === "admin") {
      await requireUser(["ADMIN"]);
      const status = sp.get("status");
      if (status) where.status = status;
    } else {
      where.status = "PUBLISHED";
    }

    const city = sp.get("city");
    if (city) where.city = city;
    const construction = sp.get("construction");
    if (construction) where.construction = construction;

    const [total, projects] = await Promise.all([
      db.project.count({ where }),
      db.project.findMany({
        where,
        include: projectListInclude,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return ok({
      data: projects.map(projectToCard),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  });
}

// ---------------- POST: create ----------------

const createSchema = z.object({
  name: z.string().trim().min(4, "Project name must be at least 4 characters").max(100),
  description: z.string().trim().min(50, "Description must be at least 50 characters").max(4000),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  locality: z.string().trim().min(2).max(80),
  propertyType: z.string().trim().min(2).max(40).default("Apartment"),
  configuration: z.string().trim().max(60).optional().nullable(),
  priceMin: z.number().int().min(1000000).optional().nullable(),
  priceMax: z.number().int().min(1000000).optional().nullable(),
  totalUnits: z.number().int().min(1).max(10000).optional(),
  availableUnits: z.number().int().min(0).max(10000).optional(),
  reraNumber: z.string().trim().max(60).optional().nullable(),
  construction: z.enum(["UNDER_CONSTRUCTION", "READY_TO_MOVE", "NEW_LAUNCH"]),
  possessionDate: z.string().trim().max(30).optional().nullable(),
  amenities: z.string().trim().max(600).optional().nullable(),
  images: z.array(z.object({ url: z.string().min(1).max(300), caption: z.string().max(80).optional() })).max(12).optional(),
  draft: z.boolean().optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser(["BUILDER", "ADMIN"]);
    const body = await parseBody(req, createSchema);

    let builderId: string | null = null;
    if (user.role === "BUILDER") {
      if (!user.builderProfile) return fail("Builder profile missing. Please contact support.", 400);
      builderId = user.builderProfile.id;
    } else {
      // admin must supply builderId through header? keep admin simple: use first builder? No — admins create via builder accounts.
      return fail("Projects are created by builder accounts.", 400);
    }

    const project = await db.project.create({
      data: {
        builderId: builderId!,
        name: body.name,
        slug: uniqueSlug(body.name),
        description: body.description,
        city: body.city,
        state: body.state,
        locality: body.locality,
        propertyType: body.propertyType,
        configuration: body.configuration ?? null,
        priceMin: body.priceMin ?? null,
        priceMax: body.priceMax ?? null,
        totalUnits: body.totalUnits ?? 0,
        availableUnits: body.availableUnits ?? 0,
        reraNumber: body.reraNumber ?? null,
        construction: body.construction,
        possessionDate: body.possessionDate ?? null,
        amenities: body.amenities ?? null,
        status: body.draft ? "DRAFT" : "PENDING",
        images: {
          create: (body.images ?? []).map((img, i) => ({
            url: img.url,
            caption: img.caption ?? null,
            sortOrder: i,
          })),
        },
      },
      include: projectListInclude,
    });

    await audit(user.id, body.draft ? "PROJECT_DRAFT_CREATED" : "PROJECT_SUBMITTED", "PROJECT", project.id, project.name);

    if (!body.draft) {
      await notifyAdmins({
        title: "Project pending approval",
        message: `${project.name} (${project.locality}, ${project.city}) was submitted for review.`,
        type: "LISTING",
        link: "#/dashboard?tab=projects",
      });
    }

    return ok({ project: projectToCard(project) }, 201);
  });
}
