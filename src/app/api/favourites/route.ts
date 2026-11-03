import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET: list favourite property ids
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const favourites = await db.favourite.findMany({
      where: { userId: user.id },
      select: { propertyId: true },
    });
    return ok({ favourites: favourites.map((f) => f.propertyId) });
  });
}

// POST: toggle favourite
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await parseBody(req, z.object({ propertyId: z.string().min(1) }));

    const property = await db.property.findUnique({ where: { id: body.propertyId }, select: { id: true } });
    if (!property) return fail("Property not found.", 404);

    const existing = await db.favourite.findUnique({
      where: { userId_propertyId: { userId: user.id, propertyId: body.propertyId } },
    });

    if (existing) {
      await db.favourite.delete({ where: { id: existing.id } });
      return ok({ favourited: false });
    }

    await db.favourite.create({ data: { userId: user.id, propertyId: body.propertyId } });
    return ok({ favourited: true });
  });
}
