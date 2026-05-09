import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="page-shell auth-surface min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] dark:border-slate-800/80 dark:bg-slate-900 sm:p-9 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_34%)]" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-300">TrackIt</p>
              <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                {title}
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">{description}</p>
            </div>

            <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Focus</p>
                <p className="mt-2 leading-6 text-white">A calmer place for budgets, bills, and day-to-day spending.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Clarity</p>
                <p className="mt-2 leading-6 text-white">Less clutter, fewer tabs, and a layout that stays out of the way.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Consistency</p>
                <p className="mt-2 leading-6 text-white">Built to feel steady on desktop and mobile alike.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">{children}</section>
      </div>
    </main>
  );
}