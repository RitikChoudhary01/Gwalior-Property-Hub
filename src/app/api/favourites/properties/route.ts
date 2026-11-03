import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";
import { propertyListInclude, toCard } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// GET: full property cards for the buyer's favourites
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const favourites = await db.favourite.findMany({
      where: { userId: user.id },
      include: { property: { include: propertyListInclude } },
      orderBy: { createdAt: "desc" },
    });
    return ok({ data: favourites.map((f) => toCard(f.property)) });
  });
}
