import Link from "next/link";
import { redirect } from "next/navigation";

import { OAuthButtons } from "@/components/oauth-buttons";
import { getCurrentUser } from "@/lib/auth";

import { signUp } from "../actions";

type SignUpPageProps = { searchParams: Promise<{ error?: string }> };

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/workspace");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-16 text-stone-100">
      <section className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm font-medium tracking-[0.2em] text-amber-300">CINEPROSPECTOR</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-stone-400">Start with a secure workspace. You can configure the rest later.</p>

        {error ? <p className="mt-5 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p> : null}

        <div className="mt-7 space-y-3">
          <OAuthButtons next="/workspace" />
        </div>

        <div className="my-6 flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-stone-700" />
          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">or</span>
          <div className="h-px flex-1 bg-stone-700" />
        </div>

        <form action={signUp} className="space-y-5">
          <label className="block text-sm font-medium" htmlFor="email">
            Email
            <input className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-base outline-none ring-amber-300 focus:ring-2" id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
            <input className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-base outline-none ring-amber-300 focus:ring-2" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="w-full rounded-lg bg-amber-300 px-4 py-2.5 font-medium text-stone-950 transition hover:bg-amber-200" type="submit">Create account</button>
        </form>

        <p className="mt-6 text-sm text-stone-400">
          Already have an account? <Link className="font-medium text-amber-300 hover:text-amber-200" href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
