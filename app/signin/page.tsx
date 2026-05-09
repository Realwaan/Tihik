import { SignInForm } from "@/components/signin-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      title="Return to your financial workspace"
      description="Sign in to review budgets, recurring payments, and shared activity without the usual clutter."
    >
      <SignInForm />
    </AuthShell>
  );
}
