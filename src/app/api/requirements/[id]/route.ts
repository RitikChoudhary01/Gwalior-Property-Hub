import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { requirementInclude, toRequirementDTO, matchPropertyInclude, toMatchPropertyDTO } from "@/lib/serializers";
import { matchProperties, type MatchableProperty } from "@/lib/matching";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { REQUIREMENT_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const REQUIREMENT_STATUS_VALUES = REQUIREMENT_STATUSES.map((s) => s.value) as readonly string[];

async function loadMatches(requirement: {
  city: string;
  localities: string | null;
  propertyType: string;
  bhk: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
}) {
  const properties = await db.property.findMany({
    where: { status: "PUBLISHED", city: requirement.city, availability: "AVAILABLE" },
    include: matchPropertyInclude,
  });
  const matchable: MatchableProperty[] = properties.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, city: p.city, locality: p.locality,
    type: p.type, bhk: p.bhk, price: p.price, reraNumber: p.reraNumber,
    verificationStatus: p.verificationStatus, imageCount: p.images.length,
  }));
  const byId = new Map(properties.map((p) => [p.id, p]));
  return matchProperties(requirement, matchable, 12)
    .map(({ property, score, reasons }) => {
      const row = byId.get(property.id);
      return row ? { ...toMatchPropertyDTO(row), score, reasons } : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

// ---------------- GET: detail + live matches ----------------

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return fail("Sign in required.", 401);

    const requirement = await db.requirement.findUnique({ where: { id }, include: requirementInclude });
    if (!requirement) return fail("Requirement not found.", 404);

    const isAdmin = user.role === "ADMIN";
    const isOwner = requirement.buyerId === user.id;
    const isAssignedTeam = user.role === "TEAM" && requirement.assignedToId === user.id;
    if (!isAdmin && !isOwner && !isAssignedTeam) return fail("Not allowed.", 403);

    const matches = await loadMatches(requirement);
    return ok({ requirement: toRequirementDTO(requirement), matches });
  });
}

// ---------------- PATCH: status / assignment (scoped) ----------------

const patchSchema = z.object({
  status: z.string().refine((s) => REQUIREMENT_STATUS_VALUES.includes(s), "Invalid status").optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return fail("Sign in required.", 401);

    const requirement = await db.requirement.findUnique({ where: { id }, include: requirementInclude });
    if (!requirement) return fail("Requirement not found.", 404);

    const isAdmin = user.role === "ADMIN";
    const isAssignedTeam = user.role === "TEAM" && requirement.assignedToId === user.id;
    if (!isAdmin && !isAssignedTeam) return fail("Not allowed.", 403);

    const body = await parseBody(req, patchSchema);
    const data: Record<string, unknown> = {};

    if (body.status && body.status !== requirement.status) {
      data.status = body.status;
    }

    if (body.assignedToId !== undefined) {
      // Only administrators can assign requirements to team members.
      if (!isAdmin) return fail("Only administrators can assign requirements.", 403);
      if (body.assignedToId) {
        const assignee = await db.user.findUnique({ where: { id: body.assignedToId } });
        if (!assignee || assignee.role !== "TEAM" || !assignee.isActive) {
          return fail("Selected team member is not available.", 422);
        }
      }
      data.assignedToId = body.assignedToId || null;
    }

    if (Object.keys(data).length === 0) {
      return ok({ requirement: toRequirementDTO(requirement) });
    }

    const updated = await db.requirement.update({
      where: { id: requirement.id },
      data,
      include: requirementInclude,
    });

    if (body.assignedToId) {
      await notify({
        userId: body.assignedToId,
        title: "Requirement assigned to you",
        message: `${requirement.name} is looking for a ${requirement.propertyType !== "Any" ? `${requirement.propertyType} ` : ""}home in ${requirement.city}. Reference ${requirement.reference}.`,
        type: "ENQUIRY",
        link: "/dashboard?tab=requirements",
      });
    }

    await audit(
      user.id,
      body.assignedToId !== undefined ? "REQUIREMENT_ASSIGNED" : "REQUIREMENT_STATUS_UPDATED",
      "REQUIREMENT",
      requirement.id,
      `Status: ${requirement.status} → ${updated.status}${body.assignedToId !== undefined ? `; assigned to ${updated.assignedTo?.name ?? "nobody"}` : ""}`
    );

    return ok({ requirement: toRequirementDTO(updated) });
  });
}
