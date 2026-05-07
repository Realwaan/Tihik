"use client";

import { UserProfile } from "@clerk/nextjs";
import { AppTopNav } from "@/components/app-top-nav";

export function ProfilePage() {
  return (
    <main className="page-shell dock-safe app-surface min-h-screen px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AppTopNav
          title="Profile"
          subtitle="Manage your account, security settings, and preferences."
        />

        <div className="mx-auto max-w-5xl">
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
      </div>
    </main>
  );
}
