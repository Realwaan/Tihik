import { FormEvent, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { mergeCategories } from "@/lib/categories";

import type { BudgetForm, BudgetRow, Currency } from "./budgets-manager-types";

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export function useBudgetsManager() {
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

  return {
    budgets,
    loading,
    saving,
    deletingId,
    month,
    setMonth,
    form,
    setForm,
    preferredCurrency,
    allCategories,
    summary,
    missingParentWarnings,
    handleSubmit,
    handleDelete,
  };
}
