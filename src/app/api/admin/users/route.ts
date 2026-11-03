// ============================================================
// Admin — user management directory (ADMIN only)
// Paginated list with search, role filter, builder profile
// and listing/project/lead counts.
// ============================================================

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const userInclude = {
  builderProfile: true,
  _count: { select: { properties: true, leads: true, favourites: true } },
} satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser(["ADMIN"]);

    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
    const role = sp.get("role");
    const q = sp.get("q");

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // merge project counts for the builders on this page
    const builderIds = users.flatMap((u) => (u.builderProfile ? [u.builderProfile.id] : []));
    const projectGroups = builderIds.length
      ? await db.project.groupBy({ by: ["builderId"], _count: true, where: { builderId: { in: builderIds } } })
      : [];
    const projectCounts = new Map(projectGroups.map((g) => [g.builderId, g._count]));

    return ok({
      data: users.map((u: UserRow) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isVerified: u.isVerified,
        isActive: u.isActive,
        city: u.city,
        createdAt: u.createdAt.toISOString(),
        builderProfile: u.builderProfile
          ? {
              id: u.builderProfile.id,
              companyName: u.builderProfile.companyName,
              isVerified: u.builderProfile.isVerified,
            }
          : null,
        _count: {
          properties: u._count.properties,
          projects: u.builderProfile ? (projectCounts.get(u.builderProfile.id) ?? 0) : 0,
          leads: u._count.leads,
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  });
}
