import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. S'assurer que la variable d'environnement est définie
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be defined for Prisma Client");
}

// 2. Créer l'instance du pool 'pg'
const pool = new Pool({
  connectionString,
});

// 3. Créer l'instance de l'adaptateur Prisma
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["query", "error", "warn"],
  });

// S'assurer que l'adaptateur est bien utilisé en production/développement
// Si tu avais des problèmes avec engineType, l'adaptateur résout ça.
// En v7, l'utilisation de l'adaptateur est la façon de faire pour ces environnements.

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  // Recommandé: s'assurer que le pool est arrêté proprement lors de l'arrêt du processus en production
  // bien que dans la plupart des environnements serverless/cloud, cela soit géré.
  process.on("SIGINT", () => {
    pool.end();
    console.log("PostgreSQL Pool closed.");
    process.exit(0);
  });
}
