import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const t0 = Date.now();
  const counts = await prisma.property.groupBy({
    by: ["city"],
    where: { status: "PUBLISHED" },
    _count: { _all: true }
  });
  console.log(`GroupBy completed in ${Date.now() - t0}ms:`, counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());

