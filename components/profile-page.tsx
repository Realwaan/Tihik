"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SignOutButton } from "@/components/auth-buttons";

type ProfilePageProps = {
  name?: string | null;
  email?: string | null;
};

export function ProfilePage({ name, email }: ProfilePageProps) {
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
            Manage your TrackIt account and session.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Name</p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{name ?? "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Email</p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{email ?? "Not set"}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="hover-rise inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:min-h-10"
            >
              Back to dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
