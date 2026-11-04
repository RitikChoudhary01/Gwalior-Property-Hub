import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const props = await prisma.property.findMany({
    select: { id: true, title: true, city: true, locality: true, status: true, featured: true }
  });
  console.log(`Total properties in DB: ${props.length}`);
  console.log(props.slice(0, 15));

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, city: true, status: true, featured: true }
  });
  console.log(`Total projects in DB: ${projects.length}`);
  console.log(projects);
}

main().catch(console.error).finally(() => prisma.$disconnect());

