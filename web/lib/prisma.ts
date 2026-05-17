import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown — close pool on hot-reload or process exit.
 * Prevents "too many connections" on Supabase free tier.
 */
if (typeof process !== "undefined") {
  process.on("beforeExit", () => prisma.$disconnect());
}
