"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getCallbackUrl(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  return value;
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const callbackUrl = useMemo(
    () => getCallbackUrl(searchParams.get("callbackUrl")),
    [searchParams]
  );
  const verifyEmail = searchParams.get("verifyEmail");

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signIn("google", { redirect: true, callbackUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      showToast("error", message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required");
      showToast("error", "Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        throw new Error("Invalid email or password");
      }

      showToast("success", "Signed in successfully");
      router.replace(result.url ?? callbackUrl);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl px-1 sm:px-0">
      <Card className="overflow-hidden rounded-[2rem] border-slate-200/90 bg-white/96 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-800/80 dark:bg-slate-950/95">
        <CardHeader className="border-b border-slate-200/70 pb-6 dark:border-slate-800/70">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Secure sign-in</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Welcome back</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
            Pick up where you left off and return to your budget, bills, and shared transactions.
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          {verifyEmail ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/70 dark:bg-emerald-900/25">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                Account created for {verifyEmail}. Use the same credentials to sign in.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800/70 dark:bg-rose-900/25">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-300">{error}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-800 dark:text-slate-200">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={loading || googleLoading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 rounded-2xl border-slate-300 bg-white pl-10 shadow-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-800 dark:text-slate-200">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading || googleLoading}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-12 rounded-2xl border-slate-300 bg-white pl-12 pr-11 shadow-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-1 h-12 w-full rounded-2xl bg-slate-950 text-base font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-[18px] w-[18px]" />
                </>
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/95 dark:text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="h-12 w-full rounded-2xl border-slate-300 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true">
                    <path
                      d="M21.35 11.1H12v2.98h5.36c-.23 1.48-1.83 4.34-5.36 4.34-3.23 0-5.86-2.67-5.86-5.95s2.63-5.95 5.86-5.95c1.84 0 3.08.79 3.78 1.46l2.58-2.49C16.72 3.99 14.57 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.65-3.65 8.65-8.79 0-.59-.06-1.04-.14-1.11Z"
                      fill="currentColor"
                    />
                  </svg>
                  Google
                </>
              )}
            </Button>
          </form>

          

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Need an account?{" "}
              <Link href="/signup" className="font-semibold text-slate-950 hover:text-slate-700 dark:text-slate-100 dark:hover:text-white">
                Sign up
              </Link>
            </p>
            <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}