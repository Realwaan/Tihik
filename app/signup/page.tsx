import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="page-shell auth-surface flex min-h-screen items-center justify-center px-4 py-6 sm:py-12">
      <SignupForm />
    </div>
  );
}
