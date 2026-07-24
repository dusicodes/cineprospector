import { getCurrentUser } from "@/lib/auth";

import { TimedRedirector } from "./redirector";

type VerifiedPageProps = {
  searchParams: Promise<{ status?: "success" | "already" }>;
};

export default async function VerifiedPage({ searchParams }: VerifiedPageProps) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  const destination = user ? "/workspace" : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-16 text-stone-100">
      <section className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-medium tracking-[0.2em] text-amber-300">CINEPROSPECTOR</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your account has been verified</h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          {status === "already"
            ? "Your confirmation link had already been used (often by an email preview) and your email is confirmed. You can sign in now."
            : "Thanks for confirming your email. You can sign in to your workspace now."}
        </p>
        <p className="mt-5 text-sm text-stone-500" aria-live="polite">
          Redirecting{user ? " to your workspace" : " to the sign-in page"}…
        </p>
        <TimedRedirector destination={destination} delayMs={3000} />
      </section>
    </main>
  );
}