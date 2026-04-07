"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { InstallmentsManager } from "@/components/installments-manager";
import { RecurringManager } from "@/components/recurring-manager";
import { TransactionsManager } from "@/components/transactions-manager";

type ViewMode = "transactions" | "recurring" | "installments";

function toViewMode(value: string | null): ViewMode {
  if (value === "recurring" || value === "installments") {
    return value;
  }

  return "transactions";
}

export function TransactionsWorkspace() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const [view, setView] = useState<ViewMode>(toViewMode(activeTab));

  useEffect(() => {
    setView(toViewMode(activeTab));
  }, [activeTab]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Transactions workspace</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Switch between entries, recurring templates, and installment plans.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setView("transactions")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              view === "transactions"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Add transactions
          </button>
          <button
            type="button"
            onClick={() => setView("recurring")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              view === "recurring"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Recurring templates
          </button>
          <button
            type="button"
            onClick={() => setView("installments")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              view === "installments"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Installments
          </button>
        </div>
      </div>

      {view === "transactions" ? (
        <TransactionsManager />
      ) : view === "recurring" ? (
        <RecurringManager />
      ) : (
        <InstallmentsManager />
      )}
    </section>
  );
}
