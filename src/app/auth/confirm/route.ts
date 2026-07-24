import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/workspace";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // Supabase sometimes redirects back with an explicit error (expired token,
  // invalid request, etc.).
  if (errorCode || errorDescription) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error",
      errorDescription?.slice(0, 200) ?? `Supabase returned error code ${errorCode}.`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();

  // Modern PKCE flow (OAuth + email): Supabase exchanges a short-lived `code`
  // for a session. OAuth providers (Google, Apple) and PKCE email confirmation
  // both land here with a `code`.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Session established — go straight to the requested destination.
      return NextResponse.redirect(new URL(next, request.url));
    }
    // The code was already consumed (email client link previews are a common
    // cause for email confirmation) or expired. If the user is already
    // authenticated (their cookie session is still valid) send them to `next`;
    // otherwise fall back to the verified page with an actionable message.
    const { data: claims } = await supabase.auth.getClaims();
    if (claims?.claims.sub) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    const url = new URL("/auth/verified", request.url);
    url.searchParams.set("status", "already");
    return NextResponse.redirect(url);
  }

  // Legacy token-hash flow (older Supabase email templates).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error) {
      // Email confirmed and a session was established. Go straight to `next`.
      return NextResponse.redirect(new URL(next, request.url));
    }

    // The OTP is one-time only. Email client link previews (Apple Mail, Gmail,
    // Outlook, Slack, etc.) frequently pre-fetch this URL, consuming the token
    // before the user actually clicks. The first fetch already marks the user's
    // email as confirmed in Supabase, so route to the verified page with an
    // "already used" status rather than treating it as an error.
    const url = new URL("/auth/verified", request.url);
    url.searchParams.set("status", "already");
    return NextResponse.redirect(url);
  }

  // No recognised callback param arrived. Echo what we actually received so the
  // user can see why the route considered the link malformed.
  const received = [...searchParams.keys()].join(",") || "(no query params)";
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "error",
    `Your confirmation link did not include a verification token or code (received keys: ${received}).`,
  );
  return NextResponse.redirect(loginUrl);
}