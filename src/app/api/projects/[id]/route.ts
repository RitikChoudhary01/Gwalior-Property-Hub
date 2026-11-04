import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { projectDetailInclude, projectToDetail } from "@/lib/serializers";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function findProject(idOrSlug: string) {
  return db.project.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: projectDetailInclude,
  });
}

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const project = await findProject(id);
    if (!project) return fail("Project not found.", 404);

    const user = await getSessionUser();
    const isOwner = user?.builderProfile && project.builderId === user.builderProfile.id;
    if (project.status !== "PUBLISHED" && !isOwner && user?.role !== "ADMIN") {
      return fail("This project is not publicly available.", 404);
    }

    return ok(projectToDetail(project));
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(4).max(100).optional(),
  description: z.string().trim().min(50).max(4000).optional(),
  city: z.string().trim().min(2).max(60).optional(),
  state: z.string().trim().min(2).max(60).optional(),
  locality: z.string().trim().min(2).max(80).optional(),
  propertyType: z.string().trim().min(2).max(40).optional(),
  configuration: z.string().trim().max(60).nullable().optional(),
  priceMin: z.number().int().min(1000000).nullable().optional(),
  priceMax: z.number().int().min(1000000).nullable().optional(),
  totalUnits: z.number().int().min(1).max(10000).optional(),
  availableUnits: z.number().int().min(0).max(10000).optional(),
  reraNumber: z.string().trim().max(60).nullable().optional(),
  construction: z.enum(["UNDER_CONSTRUCTION", "READY_TO_MOVE", "NEW_LAUNCH"]).optional(),
  possessionDate: z.string().trim().max(30).nullable().optional(),
  amenities: z.string().trim().max(600).nullable().optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), caption: z.string().max(80).optional() })).max(12).optional(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "INACTIVE"]).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await requireUser();
    const project = await findProject(id);
    if (!project) return fail("Project not found.", 404);

    const isOwner = !!user.builderProfile && project.builderId === user.builderProfile.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) return fail("You can only manage your own projects.", 403);

    const body = await parseBody(req, patchSchema);
    const data: Record<string, unknown> = {};

    for (const f of [
      "name", "description", "city", "state", "locality", "propertyType", "configuration",
      "priceMin", "priceMax", "totalUnits", "availableUnits", "reraNumber", "construction",
      "possessionDate", "amenities",
    ]) {
      if (f in body) data[f] = (body as Record<string, unknown>)[f];
    }

    if (body.status === "PUBLISHED" || body.status === "REJECTED") {
      if (!isAdmin) return fail("Only administrators can approve or reject projects.", 403);
      data.status = body.status;
      if (body.rejectionReason) data.rejectionReason = body.rejectionReason;
    } else if (body.status) {
      data.status = body.status;
    }

    const contentChanged = ["name", "description", "city", "locality", "images", "amenities"].some((f) => f in body);
    if (contentChanged && project.status === "PUBLISHED" && !isAdmin && body.status !== "PUBLISHED") {
      data.status = "PENDING";
    }

    await db.$transaction(async (tx) => {
      if (body.images) {
        await tx.projectImage.deleteMany({ where: { projectId: project.id } });
        await tx.projectImage.createMany({
          data: body.images.map((img, i) => ({
            projectId: project.id,
            url: img.url,
            caption: img.caption ?? null,
            sortOrder: i,
          })),
        });
      }
      if (Object.keys(data).length > 0) {
        await tx.project.update({ where: { id: project.id }, data });
      }
    });

    if (body.status === "PUBLISHED" && isAdmin && project.status !== "PUBLISHED") {
      await audit(user.id, "PROJECT_APPROVED", "PROJECT", project.id, project.name);
      const builder = await db.builder.findUnique({ where: { id: project.builderId } });
      if (builder) {
        await notify({
          userId: builder.userId,
          title: "Project approved",
          message: `${project.name} is now live on Gwalior Property Hub.`,
          type: "LISTING",
          link: `#/projects/${project.slug}`,
        });
      }
    }

    const updated = await findProject(project.id);
    return ok({ project: updated ? projectToDetail(updated) : null });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await requireUser();
    const project = await findProject(id);
    if (!project) return fail("Project not found.", 404);

    const isOwner = !!user.builderProfile && project.builderId === user.builderProfile.id;
    if (!isOwner && user.role !== "ADMIN") return fail("You can only delete your own projects.", 403);

    // block deletion when units exist — keep inventory integrity
    const unitCount = await db.property.count({ where: { projectId: project.id } });
    if (unitCount > 0) {
      return fail(`This project has ${unitCount} listed unit(s). Remove or reassign them before deleting the project.`, 409);
    }

    await db.project.delete({ where: { id: project.id } });
    await audit(user.id, "PROJECT_DELETED", "PROJECT", project.id, project.name);
    return ok({ ok: true });
  });
}
