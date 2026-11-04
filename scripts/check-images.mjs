import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const images = await prisma.propertyImage.findMany({
    take: 10,
    select: { url: true, isMain: true, property: { select: { title: true } } }
  });
  console.log("Property images count:", images.length);
  for (const img of images) {
    console.log(`${img.property?.title}: ${img.url}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

