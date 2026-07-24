import { createBrowserClient } from "@supabase/ssr";

/** Browser code receives only Supabase's public URL and publishable key. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createBrowserClient(url, publishableKey);
}
