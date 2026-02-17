import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrisma(): PrismaClient {
  return new PrismaClient();
}

export const prisma = globalThis.__prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
