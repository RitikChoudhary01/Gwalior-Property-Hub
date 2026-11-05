import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log queries in development — avoids overhead in production
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Persist the client across hot-reloads in dev; in production each
// serverless instance gets its own singleton (fine with Supabase pgbouncer).
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
