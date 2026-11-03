import { db } from "@/lib/db";
const rows = await db.property.findMany({ where: { status: "PUBLISHED", builderId: { not: null } }, select: { id: true, title: true, slug: true, availability: true, builder: { select: { companyName: true, user: { select: { email: true } } } } } });
console.log(JSON.stringify(rows, null, 1));
process.exit(0);
