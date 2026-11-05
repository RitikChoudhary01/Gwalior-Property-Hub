import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle, parseBody } from "@/lib/api-helpers";
import { memoryCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const cacheKey = `notifications:${user.id}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return ok(cached);

    const [data, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    const result = {
      data: data.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      unreadCount,
    };
    memoryCache.set(cacheKey, result, 30_000);
    return ok(result);
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    memoryCache.deletePrefix(`notifications:${user.id}`);
    const body = await parseBody(
      req,
      z.object({
        ids: z.array(z.string()).optional(),
        all: z.boolean().optional(),
      })
    );

    if (body.all) {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (body.ids?.length) {
      await db.notification.updateMany({
        where: { userId: user.id, id: { in: body.ids } },
        data: { isRead: true },
      });
    }
    return ok({ ok: true });
  });
}
