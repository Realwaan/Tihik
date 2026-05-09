import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Lock, ArrowRight, BadgeCheck } from "lucide-react";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin");
  }

  if (!isAdminEmail(email)) {
    redirect("/dashboard");
  }

  const adminEmail = email ?? "your account";

  return (
    <main className="page-shell auth-surface min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] dark:border-slate-800/80 dark:bg-slate-900 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-300">Admin console</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Private control room</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                This area is locked to the admin Gmail account. Use it to jump into the app, review the current
                system surface, and manage future admin-only tools.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 text-sm text-slate-200 backdrop-blur-sm">
              <div className="flex items-center gap-2 font-semibold text-white">
                <BadgeCheck className="h-4 w-4 text-emerald-300" />
                Access verified
              </div>
              <p className="mt-2 text-slate-300">Signed in as {adminEmail}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <Card className="rounded-[1.5rem] border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/95">
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Access</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">Private by design</h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <p>Only the fixed Gmail account can open this page.</p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <p>
                  Signed in as <span className="font-medium text-slate-900 dark:text-slate-100">{adminEmail}</span>.
                </p>
              </div>

              <Link
                href="/dashboard"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Return to app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}