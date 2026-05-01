import { SignupForm } from "@/components/signup-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      title="Start your smarter budget journey"
      description="Create your account to unlock automatic categorization, collaboration, and real-time budget visibility."
    >
      <SignupForm />
    </AuthShell>
  );
}
