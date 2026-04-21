import type { ReactNode } from "react";

import type { Currency } from "./budgets-manager-types";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

export function SummaryCard({
  label,
  value,
  currency,
  tone = "slate",
}: {
  label: string;
  value: number;
  currency: Currency;
  tone?: "slate" | "emerald" | "rose";
}) {
  const toneStyles = {
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  }[tone];

  return (
    <article className={`rounded-2xl px-4 py-3 ${toneStyles}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatCurrency(value, currency)}</p>
    </article>
  );
}

export function formatCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}
