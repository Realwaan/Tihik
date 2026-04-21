import { FormEvent, useEffect, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { mergeCategories } from "@/lib/categories";

import type { FormState, RecurringTemplate } from "./recurring-manager-types";

const initialForm: FormState = {
  amount: "",
  currency: "USD",
  type: "EXPENSE",
  category: "",
  sourceAccount: "",
  note: "",
  frequency: "MONTHLY",
  interval: "1",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};

export function useRecurringManager() {
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

  const missedTemplatesCount = templates.filter((template) => {
    if (!template.isActive) return false;
    const nextRun = new Date(template.nextRunDate);
    const today = new Date();
    return nextRun < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.category.trim()) {
      showToast("error", "Category is required.");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast("error", "Amount cannot be negative.");
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
          sourceAccount: form.sourceAccount.trim() || null,
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

  return {
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
  };
}
