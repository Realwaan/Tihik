"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { WalletCategoryBadge } from "@/components/ui/wallet-category-badge";
import { ACCOUNT_TEMPLATE_CATEGORIES } from "@/lib/categories";
import { Field, formatCurrency } from "./recurring-manager-ui";
import type { FormState } from "./recurring-manager-types";
import { useRecurringManager } from "./use-recurring-manager";

export function RecurringManager() {
  const {
    templates,
    loading,
    saving,
    deletingId,
    form,
    setForm,
    allCategories,
    missedTemplatesCount,
    handleSubmit,
    handleDelete,
    toggleTemplate,
  } = useRecurringManager();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recurring transactions
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Automate repeated expenses and income.
        </p>
        {missedTemplatesCount > 0 ? (
          <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {missedTemplatesCount} recurring template{missedTemplatesCount === 1 ? "" : "s"} missed schedule and will be auto-caught up on refresh.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="0.00"
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as "INCOME" | "EXPENSE",
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </Field>
          </div>

          <Field label="Currency">
            <select
              value={form.currency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currency: event.target.value as FormState["currency"],
                }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="PHP">PHP</option>
            </select>
          </Field>

          <Field label="Category">
            <CategoryCombobox
              value={form.category}
              onChange={(value) =>
                setForm((current) => ({ ...current, category: value }))
              }
              options={allCategories}
              placeholder="Rent, Salary, Subscription..."
            />
          </Field>

          <Field label="Pay from account (optional)">
            <CategoryCombobox
              value={form.sourceAccount}
              onChange={(value) =>
                setForm((current) => ({ ...current, sourceAccount: value }))
              }
              options={Array.from(new Set([...ACCOUNT_TEMPLATE_CATEGORIES])).sort((a, b) =>
                a.localeCompare(b)
              )}
              placeholder="Cash, Visa Credit, BPI..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frequency">
              <select
                value={form.frequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    frequency: event.target.value as "DAILY" | "WEEKLY" | "MONTHLY",
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </Field>
            <Field label="Interval">
              <input
                type="number"
                min="1"
                step="1"
                value={form.interval}
                onChange={(event) =>
                  setForm((current) => ({ ...current, interval: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
            <Field label="End date (optional)">
              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
          </div>

          <Field label="Note (optional)">
            <input
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Monthly rent autopost"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Save recurring template
          </button>
        </form>

        <div>
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
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No recurring templates yet.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {template.category}
                        </p>
                        <WalletCategoryBadge category={template.category} />
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            template.type === "INCOME"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          }`}
                        >
                          {template.type}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {formatCurrency(template.amount, template.currency)} • Every {template.interval}{" "}
                        {template.frequency.toLowerCase()}
                        {template.interval > 1 ? "s" : ""} • Next{" "}
                        {new Date(template.nextRunDate).toLocaleDateString()}
                      </p>
                      {template.sourceAccount ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Account: {template.sourceAccount}
                        </p>
                      ) : null}
                      {template.isActive &&
                      new Date(template.nextRunDate) <
                        new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) ? (
                        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                          Missed schedule detected. Catch-up will run automatically.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTemplate(template.id, template.isActive)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          template.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {template.isActive ? "Active" : "Paused"}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === template.id}
                        onClick={() => handleDelete(template.id)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        aria-label="Delete recurring template"
                      >
                        {deletingId === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
