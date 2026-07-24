import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js loads `.env.local` automatically at runtime, but the Prisma CLI does
// not. Load it explicitly so the CLI and the Next.js server share one file.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Prisma CLI operations require a direct Supabase database connection.
    url: env("DIRECT_URL"),
  },
});
