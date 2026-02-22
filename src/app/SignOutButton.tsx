"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:text-[var(--color-sidebar,#ffffff)] hover:bg-[var(--color-sidebar-font,#475569)]"
    >
      <span>Sign Out</span>
      <span className="text-xs opacity-60">→</span>
    </button>
  );
}