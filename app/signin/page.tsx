"use client";

import { SignInForm } from "@/components/signin-form";

export default function SignInPage() {
  return (
    <main className="page-shell auth-surface flex min-h-screen items-center justify-center px-4 py-6 sm:py-12">
      <SignInForm />
    </main>
  );
}
