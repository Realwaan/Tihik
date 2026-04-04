import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, ShieldCheck, WalletCards } from "lucide-react";

import { SignInButton } from "@/components/auth-buttons";

const features = [
  {
    icon: WalletCards,
    title: "Fast transaction capture",
    description: "Record income and expenses in seconds with a clean, focused flow.",
  },
  {
    icon: BarChart3,
    title: "Month-by-month visibility",
    description: "See balance, category spend, and trends without leaving the dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "User-scoped data access",
    description: "Every API route checks the current session before touching the database.",
  },
  {
    icon: BadgeCheck,
    title: "Production-ready structure",
    description: "Next.js App Router, Prisma, NextAuth, and Zod are wired together cleanly.",
  },
];

export function TrackItLanding() {
  return (
    <main className="page-shell relative min-h-screen overflow-hidden bg-slate-950 text-white dark-page">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">TrackIt</p>
            <p className="text-xs text-slate-300">Expense tracking for focused teams and solo users</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/signup" className="hover-rise rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              Sign Up
            </Link>
            <Link href="/dashboard" className="hover-rise rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              Dashboard
            </Link>
            <SignInButton />
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              Built for fast monthly review
            </p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Track spending without losing the signal.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              TrackIt gives you a crisp balance view, category analysis, and protected transaction APIs so the product foundation is ready for real data.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/dashboard" className="hover-rise inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/transactions" className="hover-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Manage transactions
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-slate-400">Current balance</p>
                  <p className="mt-2 text-4xl font-semibold text-white">$12,480.22</p>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  +12.4% this month
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-slate-400">Income</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">$8,920</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-slate-400">Expenses</p>
                  <p className="mt-2 text-lg font-semibold text-rose-300">$3,210</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-slate-400">Saved</p>
                  <p className="mt-2 text-lg font-semibold text-amber-300">$5,710</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Top categories</p>
                <div className="mt-4 space-y-3">
                  {[
                    ["Rent", "38%"],
                    ["Food", "24%"],
                    ["Transport", "14%"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">{label}</span>
                      <span className="text-slate-400">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="card-lift rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10">
                  <Icon className="h-5 w-5 text-amber-300" />
                  <h2 className="mt-4 text-lg font-semibold text-white">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
