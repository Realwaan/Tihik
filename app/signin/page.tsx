"use client";

import { SignInForm } from "@/components/signin-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      title="Get back to your money flow"
      description="Track spending trends, recurring bills, and collaboration updates in one focused workspace."
    >
      <SignInForm />
    </AuthShell>
  );
}
