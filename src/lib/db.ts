import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { getServerEnvironment } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Runtime queries use Supabase's pooler. Prisma CLI commands use DIRECT_URL
 * through prisma.config.ts.
 *
 * `DATABASE_URL` must use `sslmode=no-verify` (not `sslmode=require`): the pg
 * connection-string parser only relaxes certificate verification for
 * `no-verify`, while `require` leaves Node's default `rejectUnauthorized`
 * enabled, which rejects Supabase's pooler chain in some local environments
 * ("self-signed certificate in certificate chain"). TLS is still negotiated;
 * the cert chain is not verified. Pin `sslrootcert` for production.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const { DATABASE_URL } = getServerEnvironment();
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }),
    });
  }

  return globalForPrisma.prisma;
}
