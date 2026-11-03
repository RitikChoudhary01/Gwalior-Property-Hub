import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { visitInclude, toVisitDTO } from "@/lib/serializers";
import { notify } from "@/lib/notifications";
import { VISIT_TIME_SLOTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferredTime: z.string().refine((t) => VISIT_TIME_SLOTS.includes(t)).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return fail("Sign in required.", 401);

    const visit = await db.siteVisit.findUnique({
      where: { id },
      include: { property: { select: { sellerId: true, builderId: true, title: true } } },
    });
    if (!visit) return fail("Visit not found.", 404);

    const isAdmin = user.role === "ADMIN";
    const isListingOwner =
      visit.property.sellerId === user.id ||
      (!!user.builderProfile && visit.property.builderId === user.builderProfile.id);
    const isBuyer = visit.buyerId === user.id;

    if (!isAdmin && !isListingOwner && !isBuyer) return fail("Not allowed.", 403);

    const body = await parseBody(req, patchSchema);

    // buyers may only cancel their own visit
    if (isBuyer && !isAdmin && !isListingOwner) {
      if (body.status !== "CANCELLED" || body.preferredDate || body.preferredTime || body.notes !== undefined) {
        return fail("You can only cancel your visit request.", 403);
      }
    }

    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.preferredDate) {
      data.preferredDate = new Date(`${body.preferredDate}T00:00:00`);
      if (body.status !== "CANCELLED") data.status = body.status ?? "RESCHEDULED";
    }
    if (body.preferredTime) data.preferredTime = body.preferredTime;
    if (body.notes !== undefined) data.notes = body.notes;

    const updated = await db.siteVisit.update({
      where: { id: visit.id },
      data,
      include: visitInclude,
    });

    if (isListingOwner || isAdmin) {
      await audit(user.id, "SITE_VISIT_UPDATED", "VISIT", visit.id, `Status → ${updated.status}`);
    }

    // notify the buyer when the status changes
    if (updated.buyerId && body.status && body.status !== visit.status) {
      const verb: Record<string, string> = {
        CONFIRMED: "confirmed",
        RESCHEDULED: "rescheduled",
        COMPLETED: "marked completed",
        CANCELLED: "cancelled",
        REQUESTED: "re-opened",
      };
      await notify({
        userId: updated.buyerId,
        title: `Site visit ${verb[body.status] ?? "updated"}`,
        message: `Your visit to "${visit.property.title}" on ${updated.preferredDate.toDateString()} at ${updated.preferredTime} was ${verb[body.status] ?? "updated"}.`,
        type: "VISIT",
        link: "#/dashboard?tab=visits",
      });
    }

    return ok({ visit: toVisitDTO(updated) });
  });
}
