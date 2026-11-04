import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const gwlProps = await prisma.property.findMany({
    where: { city: "Gwalior" },
    select: { id: true, title: true, locality: true, status: true, featured: true }
  });
  console.log(`Gwalior properties (${gwlProps.length}):`, gwlProps);
}

main().catch(console.error).finally(() => prisma.$disconnect());

