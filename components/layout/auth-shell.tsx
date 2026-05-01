import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="page-shell auth-surface min-h-screen px-4 py-6 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <section className="hidden rounded-3xl border border-slate-200/70 bg-white/75 p-8 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/65 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600 dark:text-amber-400">TrackIt</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>

          <div className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-800/80">
              Live currency-aware budgets and transactions.
            </p>
            <p className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-800/80">
              Smart collaboration controls for shared expenses.
            </p>
            <p className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-800/80">
              Designed for desktop and mobile with PWA support.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center">{children}</section>
      </div>
    </main>
  );
}