"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Lock, Mail, Chrome } from "lucide-react";

import { useToast } from "@/components/toast-provider";

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
    <div className="w-full max-w-md px-1 sm:px-0">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to continue to TrackIt
          </p>
        </div>

        {verifyEmail ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
              Account created for {verifyEmail}. Use the email and password you registered with.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="text-sm font-medium text-red-900 dark:text-red-300">{error}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-200">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                required
                disabled={loading}
                placeholder="you@example.com"
                className="block w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-base text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-200">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="password"
                id="password"
                name="password"
                required
                disabled={loading}
                placeholder="••••••••"
                className="block w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-base text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="group relative w-full cursor-pointer overflow-hidden rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? "Signing in..." : <>Sign in <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>}
            </span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-slate-600 dark:bg-slate-900/95 dark:text-slate-400">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            <Chrome className="h-5 w-5" />
            {googleLoading ? "Signing in..." : "Google"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don’t have an account?{" "}
            <Link href="/signup" className="font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Sign up
            </Link>
          </p>
          <Link href="/" className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}