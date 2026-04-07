"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { WalletCategoryBadge } from "@/components/ui/wallet-category-badge";
import { mergeCategories } from "@/lib/categories";

type BudgetRow = {
  id: string;
  category: string;
  limit: number;
  month: string;
  spent: number;
  remaining: number;
  usagePercent: number;
  rolloverAmount?: number;
  effectiveLimit?: number;
  parentCategory?: string | null;
  isSubcategory?: boolean;
  missingParentBudget?: boolean;
  isDerivedParent?: boolean;
  hasSubcategories?: boolean;
};

type BudgetForm = {
  category: string;
  limit: string;
  month: string;
};

type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export function BudgetsManager() {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [month, setMonth] = useState("");
  const [form, setForm] = useState<BudgetForm>({
    category: "",
    limit: "",
    month: "",
  });
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>("USD");
  const [allCategories, setAllCategories] = useState<string[]>([]);

  async function loadBudgets(targetMonth: string) {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/budgets?month=${encodeURIComponent(targetMonth)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load budgets");
      }

      const json = await response.json();
      setBudgets((json.data ?? []) as BudgetRow[]);
    } catch {
      showToast("error", "Unable to load budgets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!month) return;
    loadBudgets(month);
  }, [month]);

  useEffect(() => {
    const initialMonth = currentMonthValue();
    setMonth(initialMonth);
    setForm((current) => ({ ...current, month: initialMonth }));
  }, []);

  useEffect(() => {
    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return;
        const json = await response.json();
        setPreferredCurrency((json.user?.preferredCurrency ?? "USD") as Currency);
      } catch {
        // ignore
      }
    }
    loadPreference();
  }, []);

  useEffect(() => {
    setAllCategories(mergeCategories(budgets.map((item) => item.category), "expense"));
  }, [budgets]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.category.trim()) {
      showToast("error", "Category is required.");
      return;
    }

    const limit = Number(form.limit);
    if (!Number.isFinite(limit) || limit <= 0) {
      showToast("error", "Limit must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: form.category.trim(),
          limit,
          month: form.month,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save budget");
      }

      showToast("success", "Budget saved successfully!");
      setForm((current) => ({
        ...current,
        category: "",
        limit: "",
      }));
      await loadBudgets(month);
    } catch {
      showToast("error", "Could not save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      setBudgets((current) => current.filter((budget) => budget.id !== id));
      showToast("success", "Budget deleted.");
    } catch {
      showToast("error", "Could not delete budget.");
    } finally {
      setDeletingId(null);
    }
  }

  const summary = useMemo(() => {
    const sourceRows = budgets.filter((budget) => !budget.isDerivedParent);
    const totalSpent = sourceRows.reduce((sum, budget) => sum + budget.spent, 0);
    const normalizedTotalLimit = sourceRows.reduce(
      (sum, budget) => sum + (budget.effectiveLimit ?? budget.limit),
      0
    );
    const remaining = normalizedTotalLimit - totalSpent;
    return { totalLimit: normalizedTotalLimit, totalSpent, remaining };
  }, [budgets]);

  const missingParentWarnings = useMemo(
    () => budgets.filter((budget) => budget.missingParentBudget).length,
    [budgets]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-3xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Set monthly budget
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add category limits and track spending progress.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Month">
              <input
                type="month"
                value={form.month}
                onChange={(event) =>
                  setForm((current) => ({ ...current, month: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>

            <Field label="Category">
              <CategoryCombobox
                value={form.category}
                onChange={(value) =>
                  setForm((current) => ({ ...current, category: value }))
                }
                options={allCategories}
                placeholder="Food, Rent, Transport..."
              />
            </Field>

            <Field label="Limit">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.limit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, limit: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="0.00"
              />
            </Field>

            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save budget
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardContent className="pt-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Budget progress
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Compare your limits against this month&apos;s spending.
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setForm((current) => ({ ...current, month: event.target.value }));
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total limit" value={summary.totalLimit} currency={preferredCurrency} />
          <SummaryCard label="Spent" value={summary.totalSpent} tone="rose" currency={preferredCurrency} />
          <SummaryCard
            label="Remaining"
            value={summary.remaining}
            tone={summary.remaining < 0 ? "rose" : "emerald"}
            currency={preferredCurrency}
          />
        </div>

        {missingParentWarnings > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
            {missingParentWarnings} subcategory budget{missingParentWarnings === 1 ? "" : "s"} do not have a parent category budget.
            Add a parent budget to improve rollup visibility.
          </div>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rounded"
                  animation="wave"
                  height={64}
                  className="rounded-2xl"
                />
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No budgets set for this month yet.
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((budget) => {
                const effectiveLimit = budget.effectiveLimit ?? budget.limit;
                const isNearLimit =
                  budget.usagePercent >= 80 && budget.usagePercent < 100;
                const isOverLimit = budget.usagePercent >= 100;
                const canDelete = !budget.isDerivedParent;

                return (
                  <article
                    key={budget.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-slate-900 dark:text-slate-100 ${budget.isSubcategory ? "pl-3" : ""}`}>
                            {budget.category}
                          </p>
                          <WalletCategoryBadge category={budget.category} />
                          {budget.isDerivedParent ? (
                            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              Subcategory total
                            </span>
                          ) : null}
                          {budget.hasSubcategories && !budget.isDerivedParent ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              Parent category
                            </span>
                          ) : null}
                          {budget.missingParentBudget ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Missing parent budget
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {formatCurrency(budget.spent, preferredCurrency)} /{" "}
                          {formatCurrency(effectiveLimit, preferredCurrency)}
                        </p>
                        {(budget.rolloverAmount ?? 0) > 0 ? (
                          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                            Includes rollover: {formatCurrency(budget.rolloverAmount ?? 0, preferredCurrency)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        {(isNearLimit || isOverLimit) && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              isOverLimit
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {isOverLimit ? "Over budget" : "Near limit"}
                          </span>
                        )}
                        {canDelete ? (
                          <button
                            type="button"
                            disabled={deletingId === budget.id}
                            onClick={() => handleDelete(budget.id)}
                            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            aria-label="Delete budget"
                          >
                            {deletingId === budget.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isOverLimit
                            ? "bg-rose-500"
                            : isNearLimit
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, budget.usagePercent))}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({
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

function formatCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}
