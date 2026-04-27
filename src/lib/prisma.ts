import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const resolveDatabaseConnectionString = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim().replace(/^"(.*)"$/, "$1");

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  if (!databaseUrl.startsWith("prisma+postgres://")) {
    return databaseUrl;
  }

  const directUrl = new URL(databaseUrl).searchParams.get("directUrl");

  if (directUrl) {
    return decodeURIComponent(directUrl);
  }

  const apiKey = new URL(databaseUrl).searchParams.get("api_key");

  if (!apiKey) {
    throw new Error("DATABASE_URL is missing both directUrl and the embedded api_key.");
  }

  const decodedConfig = JSON.parse(
    Buffer.from(apiKey, "base64url").toString("utf8"),
  ) as { databaseUrl?: string };

  if (!decodedConfig.databaseUrl) {
    throw new Error("DATABASE_URL does not include a direct databaseUrl.");
  }

  return decodedConfig.databaseUrl;
};

export const getPrisma = () => {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({
      connectionString: resolveDatabaseConnectionString(),
    });

    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      adapter,
    });
  }

  return globalForPrisma.prisma;
};
