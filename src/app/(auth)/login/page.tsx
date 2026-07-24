import Link from "next/link";
import { redirect } from "next/navigation";

import { OAuthButtons } from "@/components/oauth-buttons";
import { getCurrentUser } from "@/lib/auth";

import { signIn } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/workspace");

  const { error, message, next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/workspace";

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-16 text-stone-100">
      <section className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm font-medium tracking-[0.2em] text-amber-300">CINEPROSPECTOR</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-stone-400">Sign in to access your workspace.</p>

        {error ? <p className="mt-5 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p> : null}
        {message ? <p className="mt-5 rounded-lg bg-emerald-950/60 p-3 text-sm text-emerald-200">{message}</p> : null}

        <div className="mt-7 space-y-3">
          <OAuthButtons next={safeNext} />
        </div>

        <div className="my-6 flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-stone-700" />
          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">or</span>
          <div className="h-px flex-1 bg-stone-700" />
        </div>

        <form action={signIn} className="space-y-5">
          <input name="next" type="hidden" value={safeNext} />
          <label className="block text-sm font-medium" htmlFor="email">
            Email
            <input className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-base outline-none ring-amber-300 focus:ring-2" id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
            <input className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-base outline-none ring-amber-300 focus:ring-2" id="password" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="w-full rounded-lg bg-amber-300 px-4 py-2.5 font-medium text-stone-950 transition hover:bg-amber-200" type="submit">Sign in</button>
        </form>

        <p className="mt-6 text-sm text-stone-400">
          New to CineProspector? <Link className="font-medium text-amber-300 hover:text-amber-200" href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
