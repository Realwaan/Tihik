"use client";

import { useEffect, useState } from "react";

import { TransactionsWorkspace } from "@/components/transactions-workspace";

export function TransactionsWorkspaceShell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="h-6 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return <TransactionsWorkspace />;
}