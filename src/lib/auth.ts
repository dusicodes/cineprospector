import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = { id: string; email: string | null };

/** Validates the signed Supabase JWT and returns only safe identity fields. */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const jwtClaims = data?.claims;

  if (error || !jwtClaims?.sub) {
    return null;
  }

  return {
    id: jwtClaims.sub,
    email: typeof jwtClaims.email === "string" ? jwtClaims.email : null,
  };
});

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
