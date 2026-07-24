import "server-only";

import type { AuthenticatedUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

/** Ensures every authenticated Supabase user has one application profile. */
export async function ensureProfile(user: AuthenticatedUser) {
  return getPrisma().profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email },
    update: { email: user.email },
    select: { id: true, email: true, displayName: true },
  });
}
