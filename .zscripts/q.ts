import { db } from "@/lib/db";
const users = await db.user.findMany({ where: { id: { in: ["41fcbbde-7bc7-4de8-9a39-2714639cc6bd"] } }, select: { id: true, email: true, name: true, role: true } });
console.log(JSON.stringify(users, null, 1));
process.exit(0);
