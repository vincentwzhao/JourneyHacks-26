"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { MorningBrief } from "./MorningBrief";

export function SignInPanel() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Morning Brief</h1>
        <p className="max-w-sm text-sm text-black/60 dark:text-white/60">
          Connect your Google Calendar to get a quiet, side-panel rundown of what&apos;s
          urgent and important each morning.
        </p>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Morning Brief</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Signed in as {session.user?.email}. Check the tab on the right edge any time.
      </p>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
      >
        Sign out
      </button>
      <MorningBrief />
    </div>
  );
}
