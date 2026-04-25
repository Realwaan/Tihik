"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="page-shell auth-surface flex min-h-screen items-center justify-center px-4 py-6 sm:py-12">
      <SignIn
        path="/signin"
        routing="path"
        forceRedirectUrl="/dashboard"
        signUpUrl="/signup"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "w-full rounded-3xl border border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/95",
          },
        }}
      />
    </main>
  );
}
