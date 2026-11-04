import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { scryptSync, timingSafeEqual } from "crypto";

const prisma = new PrismaClient();

function verifyPassword(password, stored) {
  try {
    const [version, salt, hash] = stored.split(":");
    if (version !== "s1" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@vasati.in" }
  });
  console.log("Admin user:", admin ? { email: admin.email, role: admin.role, hashPrefix: admin.passwordHash.slice(0, 15) } : "NOT FOUND");
  
  if (admin) {
    const passwordsToTest = ["Admin@123", "admin123", "Admin123", "Admin@1234", "password", "Vasati@123", "gwalior123", "Admin@gph"];
    for (const p of passwordsToTest) {
      console.log(`Testing "${p}":`, verifyPassword(p, admin.passwordHash));
    }
  }

  // Check properties
  const featured = await prisma.property.findMany({
    where: { featured: true, status: "APPROVED" },
    select: { id: true, title: true, status: true, featured: true }
  });
  console.log("Featured approved properties:", featured);

  const allApproved = await prisma.property.findMany({
    where: { status: "APPROVED" },
    select: { id: true, title: true, city: true, locality: true, featured: true }
  });
  console.log("Total approved properties:", allApproved.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
