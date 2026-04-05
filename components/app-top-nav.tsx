"use client";

import { MobileNavDock } from "@/components/mobile-nav-dock";

type TopNavProps = {
  title: string;
  subtitle?: string;
};

export function AppTopNav({ title, subtitle }: TopNavProps) {
  return (
    <>
    <header className="mb-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 sm:mb-7 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">TrackIt</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 sm:mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </header>

    <MobileNavDock />
    </>
  );
}
