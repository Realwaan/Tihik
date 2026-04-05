"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";
import { useToast } from "@/components/toast-provider";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { mergeCategories } from "@/lib/categories";

type RecurringTemplate = {
  id: string;
  amount: number;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: "INCOME" | "EXPENSE";
  category: string;
  note?: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  startDate: string;
  nextRunDate: string;
  endDate?: string | null;
  isActive: boolean;
};

type FormState = {
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: "INCOME" | "EXPENSE";
  category: string;
  note: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: string;
  startDate: string;
  endDate: string;
};

const initialForm: FormState = {
  amount: "",
  currency: "USD",
  type: "EXPENSE",
  category: "",
  note: "",
  frequency: "MONTHLY",
  interval: "1",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};

export function RecurringManager() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [preferredCurrency, setPreferredCurrency] =
    useState<FormState["currency"]>("USD");
  const [allCategories, setAllCategories] = useState<string[]>([]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const response = await fetch("/api/recurring");
      if (!response.ok) {
        throw new Error("Failed to load recurring templates");
      }
      const json = await response.json();
      setTemplates((json.data ?? []) as RecurringTemplate[]);
    } catch {
      showToast("error", "Unable to load recurring templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return;
        const json = await response.json();
        const currency = (json.user?.preferredCurrency ?? "USD") as FormState["currency"];
        setPreferredCurrency(currency);
        setForm((current) => ({ ...current, currency }));
      } catch {
        // ignore preference load errors
      }
    }
    loadPreference();
  }, []);

  useEffect(() => {
    setAllCategories(
      mergeCategories(
        templates
          .filter((item) => item.type === form.type)
          .map((item) => item.category),
        form.type === "INCOME" ? "income" : "expense"
      )
    );
  }, [templates, form.type]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.category.trim()) {
      showToast("error", "Category is required.");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("error", "Amount must be greater than 0.");
      return;
    }

    const interval = Number(form.interval);
    if (!Number.isInteger(interval) || interval <= 0) {
      showToast("error", "Interval must be a positive integer.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: form.currency,
          type: form.type,
          category: form.category.trim(),
          note: form.note.trim() || null,
          frequency: form.frequency,
          interval,
          startDate: form.startDate,
          endDate: form.endDate ? form.endDate : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create recurring template");
      }

      showToast("success", "Recurring template created.");
      setForm({ ...initialForm, currency: preferredCurrency });
      await loadTemplates();
    } catch {
      showToast("error", "Could not create recurring template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/recurring/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recurring template");
      }

      setTemplates((current) => current.filter((item) => item.id !== id));
      showToast("success", "Recurring template deleted.");
    } catch {
      showToast("error", "Could not delete recurring template.");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleTemplate(id: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update recurring template");
      }

      setTemplates((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isActive: !currentValue } : item
        )
      );
    } catch {
      showToast("error", "Could not update recurring template.");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recurring transactions
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Automate repeated expenses and income.
        </p>
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

function formatCurrency(
  value: number,
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP"
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}
