"use client";

import {
  SignInButton as ClerkSignInButton,
  SignOutButton as ClerkSignOutButton,
} from "@clerk/nextjs";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

export function SignInButton({ className }: { className?: string }) {
  return (
    <ClerkSignInButton mode="redirect" forceRedirectUrl="/dashboard">
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 sm:min-h-10 sm:w-auto sm:py-2",
          className
        )}
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </button>
    </ClerkSignInButton>
  );
}

export function SignOutButton() {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <ClerkSignOutButton>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </ClerkSignOutButton>
    </div>
  );
}
