"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserProfile } from "@clerk/nextjs";

export function ProfilePage() {
  const router = useRouter();

  return (
    <main className="page-shell dock-safe app-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="hover-rise inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 transition-all duration-200 ease-out hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 motion-reduce:transition-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
        </div>

        <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30 sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Profile settings</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage your account directly in Clerk.
          </p>

          <div className="mt-8">
            <UserProfile
              path="/profile"
              routing="path"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full max-w-none shadow-none border border-slate-200 dark:border-slate-700",
                },
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
