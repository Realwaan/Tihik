import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Goal, ReceiptText, Repeat2, WalletCards } from "lucide-react";

import { auth } from "@/auth";
import { AppTopNav } from "@/components/app-top-nav";

export default async function PlanPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="page-shell dock-safe app-surface min-h-screen px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AppTopNav
          title="Plan"
          subtitle="Organize budgets, recurring payments, and account actions in one place."
        />

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Current cycle</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{monthLabel}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Review rollover budgets and due recurring templates before month-end.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Goal className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Budget strategy</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Parent + subcategory aware</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Use subcategories for detail and parent budgets for clean rollups and warnings.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              <WalletCards className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Account health</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Debit and credit visibility</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Track net worth movement daily and inspect account-level transaction impact.
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Plan Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/budgets"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Goal className="h-4 w-4" />
              Manage budgets
            </Link>
            <Link
              href="/transactions?tab=recurring"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Repeat2 className="h-4 w-4" />
              Manage recurring
            </Link>
            <Link
              href="/transactions?tab=installments"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ReceiptText className="h-4 w-4" />
              Manage installments
            </Link>
            <Link
              href="/account-overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <WalletCards className="h-4 w-4" />
              Open account overview
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
