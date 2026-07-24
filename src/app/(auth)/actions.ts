"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OAuthProvider = "google" | "apple";

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/workspace";
}

function authRedirect(path: "/login" | "/signup", key: "error" | "message", value: string) {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

export async function signIn(formData: FormData) {
  const email = fieldValue(formData, "email");
  const password = fieldValue(formData, "password");
  const next = safeNext(fieldValue(formData, "next"));

  if (!email || !password) redirect(authRedirect("/login", "error", "Email and password are required."));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(authRedirect("/login", "error", error.message));

  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = fieldValue(formData, "email");
  const password = fieldValue(formData, "password");

  if (!email || !password) redirect(authRedirect("/signup", "error", "Email and password are required."));
  if (password.length < 8) redirect(authRedirect("/signup", "error", "Use a password of at least 8 characters."));

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/workspace` },
  });

  if (error) redirect(authRedirect("/signup", "error", error.message));
  if (data.session) redirect("/workspace");

  redirect(authRedirect("/login", "message", "Check your email to confirm your account, then sign in."));
}

/**
 * Initiates an OAuth sign-in (or sign-up — the flow is identical for OAuth).
 * The chosen provider and post-auth destination are stashed in cookies so the
 * `/auth/confirm` callback can route the user to the right place and so the
 * application can confirm the provider the user actually started the flow with.
 * No provider credentials are read here; Supabase owns those in its dashboard.
 */
export async function signInWithOAuth(formData: FormData) {
  const provider = fieldValue(formData, "provider") as OAuthProvider;
  const next = safeNext(fieldValue(formData, "next"));

  if (provider !== "google" && provider !== "apple") {
    redirect(authRedirect("/login", "error", "Unsupported authentication provider."));
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/confirm`,
      queryParams: { next },
    },
  });

  if (error || !data.url) {
    redirect(
      authRedirect(
        "/login",
        "error",
        error?.message ?? "Could not start the provider sign-in. Is it enabled in the Supabase dashboard?",
      ),
    );
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
