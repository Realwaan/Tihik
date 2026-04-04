"use client";

import { signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      <LogIn className="h-4 w-4" />
      Sign in
    </button>
  );
}

export function SignOutButton() {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
