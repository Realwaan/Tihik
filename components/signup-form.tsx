"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Sparkles, User } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      showToast("error", "All fields are required");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      showToast("error", "Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      showToast("error", "Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      showToast("success", "Account created. Please verify your email before collaboration access.");
      setTimeout(() => router.push(`/signin?verifyEmail=${encodeURIComponent(email)}`), 1200);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      showToast("error", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl px-1 sm:px-0">
      <Card className="overflow-hidden border-slate-200/90 bg-white/95 shadow-xl dark:border-slate-700/80 dark:bg-slate-900/95">
        <CardHeader className="relative overflow-hidden border-b border-slate-200/70 pb-6 dark:border-slate-800/70">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.16),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.14),transparent_40%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">TrackIt onboarding</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create your account</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Set up your profile and start tracking smarter.</p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/85 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {error ? (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-800/70 dark:bg-rose-900/25">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-300">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-800 dark:text-slate-200">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  id="name"
                  name="name"
                  required
                  disabled={loading}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-800 dark:text-slate-200">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type="email"
                  id="email"
                  name="email"
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-800 dark:text-slate-200">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  disabled={loading}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="h-11 rounded-xl px-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-800 dark:text-slate-200">Confirm password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minLength={8}
                  disabled={loading}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="h-11 rounded-xl px-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full rounded-xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </Link>
            </p>
            <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Back to home
            </Link>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            By creating an account, you agree to our{" "}
            <a href="#" className="underline hover:text-slate-700 dark:hover:text-slate-200">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="underline hover:text-slate-700 dark:hover:text-slate-200">Privacy Policy</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
