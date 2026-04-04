"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
  const error = searchParams?.get("error");
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (provider: string) => {
    setLoading(provider);
    if (provider === "credentials") {
      setLoading(null);
      return;
    }

    try {
      const csrfResponse = await fetch("/api/auth/csrf");
      if (!csrfResponse.ok) {
        throw new Error("Failed to get CSRF token");
      }

      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken?: string;
      };

      if (!csrfToken) {
        throw new Error("Missing CSRF token");
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/api/auth/signin/${provider}`;

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = callbackUrl;
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch {
      setLoading(null);
    }
  };

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "OAuthAccountNotLinked":
        return "This email is already registered with a different sign-in method. Please use your original sign-in method.";
      case "OAuthSignin":
      case "OAuthCallback":
        return "Error signing in with OAuth provider. Please try again.";
      case "CredentialsSignin":
        return "Invalid email or password.";
      default:
        return error ? "An error occurred during sign in." : null;
    }
  };

  const errorMessage = getErrorMessage(error);

  const handleCredentialsSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      return;
    }

    setLoading("credentials");
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setLoading(null);
      return;
    }

    router.push(result?.url ?? callbackUrl);
  };

  return (
    <div className="page-shell flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <Card className="rounded-3xl dark:border-slate-800 dark:bg-slate-900/95">
          <CardHeader className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome to TrackIt</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Choose your sign-in method
            </p>
          </CardHeader>

          <CardContent>
          <form onSubmit={handleCredentialsSignIn} className="mb-5 rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Mail className="h-4 w-4" />
              Sign in with Email
            </p>
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="email"
                disabled={loading !== null}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                disabled={loading !== null}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <Button
                type="submit"
                disabled={loading !== null}
                className="w-full rounded-lg"
              >
                {loading === "credentials" ? "Signing in..." : "Continue with Email"}
              </Button>
            </div>
          </form>

          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
              <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleSignIn("google")}
              disabled={loading !== null}
              className="hover-rise flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading === "google" ? "Signing in..." : "Continue with Google"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{" "}
              <a 
                href="/signup" 
                className="font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign up
              </a>
            </p>
          </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          By signing in, you agree to our{" "}
          <a href="#" className="underline hover:text-slate-700 dark:hover:text-slate-200">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-slate-700 dark:hover:text-slate-200">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white text-slate-700 dark:bg-slate-950 dark:text-slate-200">Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}
