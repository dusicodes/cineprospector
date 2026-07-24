import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { ensureProfile } from "@/features/profiles/profile.service";
import { requireCurrentUser } from "@/lib/auth";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();
  await ensureProfile(user);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Workspace navigation">
          <Link className="text-sm font-semibold tracking-[0.2em] text-amber-300" href="/workspace">CINEPROSPECTOR</Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-stone-400 sm:block">{user.email ?? "Signed in"}</span>
            <form action={signOut}>
              <button className="rounded-md border border-stone-700 px-3 py-1.5 text-sm font-medium text-stone-200 hover:border-stone-500 hover:bg-stone-900" type="submit">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}
