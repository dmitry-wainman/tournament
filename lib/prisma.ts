import { PrismaClient } from "@prisma/client";

// Prevents creating a new PrismaClient per serverless invocation / per route module,
// which causes connection exhaustion and build-time instability on Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
