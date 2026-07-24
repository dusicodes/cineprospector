import type { ReactElement } from "react";

import { signInWithOAuth, type OAuthProvider } from "@/app/(auth)/actions";

type OAuthButtonsProps = {
  next: string;
};

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 11v2.8h6.9c-.3 1.8-2 5.2-6.9 5.2-4.1 0-7.5-3.4-7.5-7.6S7.9 3.8 12 3.8c2.4 0 4 .9 5 1.8L19.4 3C17.7 1.4 15.1 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.3-.2-1.8H12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17.05 12.83c-.03-2.69 2.2-3.98 2.3-4.05-1.26-1.85-3.22-2.1-3.92-2.13-1.67-.17-3.26.99-4.1.99-.85 0-2.15-.96-3.54-.93-1.82.03-3.5 1.06-4.43 2.69-1.9 3.29-.49 8.17 1.36 10.82.91 1.3 1.99 2.76 3.4 2.71 1.36-.06 1.88-.88 3.52-.88 1.65 0 2.12.88 3.56.85 1.47-.03 2.4-1.33 3.3-2.64 1.04-1.51 1.47-2.97 1.5-3.05-.03-.02-2.88-1.11-2.91-4.41zM14.34 5.3c.75-.91 1.26-2.17 1.12-3.42-1.08.04-2.39.72-3.16 1.62-.69.8-1.3 2.08-1.14 3.31 1.21.09 2.44-.61 3.18-1.51z" />
    </svg>
  );
}

export function OAuthButtons({ next }: OAuthButtonsProps) {
  const providers: Array<{
    provider: OAuthProvider;
    label: string;
    Icon: () => ReactElement;
    disabled?: boolean;
    title?: string;
  }> = [
    { provider: "google", label: "Continue with Google", Icon: GoogleIcon },
    {
      provider: "apple",
      label: "Continue with Apple",
      Icon: AppleIcon,
      disabled: true,
      title: "Apple Sign-In is coming soon.",
    },
  ];

  return (
    <div className="space-y-3">
      {providers.map(({ provider, label, Icon, disabled, title }) => (
        <form action={signInWithOAuth} key={provider}>
          <input name="provider" type="hidden" value={provider} />
          <input name="next" type="hidden" value={next} />
          <button
            className="flex w-full items-center justify-center gap-3 cursor-pointer rounded-lg border border-stone-700 bg-stone-950 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:border-stone-500 hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-700 disabled:hover:bg-stone-950"
            disabled={disabled}
            title={title}
            type="submit"
          >
            <Icon />
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}

