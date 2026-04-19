"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Skeleton from "@mui/material/Skeleton";

import { useToast } from "@/components/toast-provider";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { ACCOUNT_TEMPLATE_CATEGORIES } from "@/lib/categories";

type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
type InstallmentStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
type AccountType = "DEBIT" | "CREDIT";

type InstallmentPayment = {
  id: string;
  amount: number;
  currency: Currency;
  installmentsCovered: number;
  paidAt: string;
  sourceAccount: string | null;
  note: string | null;
  linkedTransactionId: string | null;
};

type InstallmentPlan = {
  id: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  currency: Currency;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  nextDueDate: string;
  sourceAccount: string | null;
  accountType: AccountType;
  note: string | null;
  status: InstallmentStatus;
  lastPaymentAt: string | null;
  createdAt: string;
  updatedAt: string;
  remainingAmount: number;
  overpaidAmount: number;
  remainingInstallments: number;
  payments: InstallmentPayment[];
};

type PlanFormState = {
  title: string;
  totalAmount: string;
  installmentAmount: string;
  totalInstallments: string;
  paidAmount: string;
  paidInstallments: string;
  currency: Currency;
  frequency: RecurrenceFrequency;
  interval: string;
  startDate: string;
  nextDueDate: string;
  sourceAccount: string;
  accountType: AccountType;
  note: string;
};

type PaymentFormState = {
  amount: string;
  installmentsCovered: string;
  paidAt: string;
  sourceAccount: string;
  note: string;
  createLinkedTransaction: boolean;
  advanceNextDue: boolean;
};

const today = new Date().toISOString().slice(0, 10);

const initialPlanForm: PlanFormState = {
  title: "",
  totalAmount: "",
  installmentAmount: "",
  totalInstallments: "12",
  paidAmount: "",
  paidInstallments: "",
  currency: "USD",
  frequency: "MONTHLY",
  interval: "1",
  startDate: today,
  nextDueDate: today,
  sourceAccount: "",
  accountType: "DEBIT",
  note: "",
};

const initialPaymentForm: PaymentFormState = {
  amount: "",
  installmentsCovered: "1",
  paidAt: today,
  sourceAccount: "",
  note: "",
  createLinkedTransaction: true,
  advanceNextDue: true,
};

export function InstallmentsManager() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlanFormState>(initialPlanForm);
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>("USD");
  const [statusFilter, setStatusFilter] = useState<"ALL" | InstallmentStatus>("ALL");

  const [openPaymentPlanId, setOpenPaymentPlanId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentForm);
  const [loggingPaymentPlanId, setLoggingPaymentPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);
  const [adjustingPlanId, setAdjustingPlanId] = useState<string | null>(null);

  async function loadPlans(filter: "ALL" | InstallmentStatus = statusFilter) {
    try {
      setLoading(true);
      const search = filter === "ALL" ? "" : `?status=${filter}`;
      const response = await fetch(`/api/installments${search}`);
      if (!response.ok) {
        throw new Error("Failed to load installments");
      }

      const json = (await response.json()) as { data?: InstallmentPlan[] };
      setPlans((json.data ?? []) as InstallmentPlan[]);
    } catch {
      showToast("error", "Unable to load installments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return;
        const json = (await response.json()) as {
          user?: { preferredCurrency?: Currency };
        };
        const currency = (json.user?.preferredCurrency ?? "USD") as Currency;
        setPreferredCurrency(currency);
        setForm((current) => ({ ...current, currency }));
      } catch {
        // ignore preference load errors
      }
    }

    loadPreference();
  }, []);

  const accountOptions = useMemo(() => {
    const accountSet = new Set<string>(ACCOUNT_TEMPLATE_CATEGORIES);

    for (const plan of plans) {
      if (plan.sourceAccount?.trim()) {
        accountSet.add(plan.sourceAccount.trim());
      }
      for (const payment of plan.payments) {
        if (payment.sourceAccount?.trim()) {
          accountSet.add(payment.sourceAccount.trim());
        }
      }
    }

    return Array.from(accountSet).sort((a, b) => a.localeCompare(b));
  }, [plans]);

  const stats = useMemo(() => {
    const active = plans.filter((plan) => plan.status === "ACTIVE").length;
    const paused = plans.filter((plan) => plan.status === "PAUSED").length;
    const completed = plans.filter((plan) => plan.status === "COMPLETED").length;

    const todayStart = new Date();
    const dueThreshold = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + 7);

    const dueSoon = plans.filter((plan) => {
      if (plan.status !== "ACTIVE") {
        return false;
      }

      const nextDue = new Date(plan.nextDueDate);
      return nextDue <= dueThreshold;
    }).length;

    const totalOutstanding = plans.reduce((sum, plan) => sum + Math.max(0, plan.remainingAmount), 0);

    return {
      active,
      paused,
      completed,
      dueSoon,
      totalOutstanding,
    };
  }, [plans]);

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      showToast("error", "Plan title is required.");
      return;
    }

    const totalAmount = Number(form.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      showToast("error", "Total amount must be greater than 0.");
      return;
    }

    const installmentAmount = Number(form.installmentAmount);
    if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) {
      showToast("error", "Installment amount must be greater than 0.");
      return;
    }

    const totalInstallments = Number(form.totalInstallments);
    if (!Number.isInteger(totalInstallments) || totalInstallments <= 0) {
      showToast("error", "Total installments must be a positive integer.");
      return;
    }

    const interval = Number(form.interval);
    if (!Number.isInteger(interval) || interval <= 0) {
      showToast("error", "Interval must be a positive integer.");
      return;
    }

    const paidAmount = form.paidAmount.trim() ? Number(form.paidAmount) : 0;
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      showToast("error", "Paid amount cannot be negative.");
      return;
    }

    const paidInstallments = form.paidInstallments.trim()
      ? Number(form.paidInstallments)
      : 0;
    if (!Number.isInteger(paidInstallments) || paidInstallments < 0) {
      showToast("error", "Paid installments cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/installments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          totalAmount,
          installmentAmount,
          totalInstallments,
          paidAmount,
          paidInstallments,
          currency: form.currency,
          frequency: form.frequency,
          interval,
          startDate: form.startDate,
          nextDueDate: form.nextDueDate,
          sourceAccount: form.sourceAccount.trim() || null,
          accountType: form.accountType,
          note: form.note.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create installment plan");
      }

      showToast("success", "Installment plan created.");
      setForm({ ...initialPlanForm, currency: preferredCurrency, startDate: today, nextDueDate: today });
      await loadPlans(statusFilter);
    } catch {
      showToast("error", "Could not create installment plan.");
    } finally {
      setSaving(false);
    }
  }

  function openPaymentForm(plan: InstallmentPlan) {
    setOpenPaymentPlanId(plan.id);
    setPaymentForm({
      ...initialPaymentForm,
      amount: plan.installmentAmount.toString(),
      sourceAccount: plan.sourceAccount ?? "",
      paidAt: new Date().toISOString().slice(0, 10),
    });
  }

  async function handleLogPayment(plan: InstallmentPlan, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast("error", "Payment amount cannot be negative.");
      return;
    }

    const installmentsCovered = Number(paymentForm.installmentsCovered);
    if (!Number.isInteger(installmentsCovered) || installmentsCovered < 0) {
      showToast("error", "Covered installments cannot be negative.");
      return;
    }

    try {
      setLoggingPaymentPlanId(plan.id);
      const response = await fetch(`/api/installments/${plan.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: plan.currency,
          installmentsCovered,
          paidAt: paymentForm.paidAt,
          sourceAccount: paymentForm.sourceAccount.trim() || null,
          note: paymentForm.note.trim() || null,
          createLinkedTransaction: paymentForm.createLinkedTransaction,
          advanceNextDue: paymentForm.advanceNextDue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log payment");
      }

      const json = (await response.json()) as { data?: { plan?: InstallmentPlan } };
      const updatedPlan = json.data?.plan;

      if (updatedPlan) {
        setPlans((current) =>
          current.map((item) => (item.id === updatedPlan.id ? updatedPlan : item))
        );
      } else {
        await loadPlans(statusFilter);
      }

      setOpenPaymentPlanId(null);
      showToast("success", "Installment payment logged.");
    } catch {
      showToast("error", "Could not log installment payment.");
    } finally {
      setLoggingPaymentPlanId(null);
    }
  }

  async function handleDeletePayment(planId: string, paymentId: string) {
    try {
      setDeletingPaymentId(paymentId);
      const response = await fetch(`/api/installments/${planId}/payments/${paymentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete payment");
      }

      const json = (await response.json()) as { data?: InstallmentPlan };
      if (json.data) {
        setPlans((current) =>
          current.map((item) => (item.id === json.data?.id ? (json.data as InstallmentPlan) : item))
        );
      } else {
        await loadPlans(statusFilter);
      }
      showToast("success", "Payment removed.");
    } catch {
      showToast("error", "Could not delete payment.");
    } finally {
      setDeletingPaymentId(null);
    }
  }

  async function handleToggleStatus(plan: InstallmentPlan) {
    const nextStatus: InstallmentStatus =
      plan.status === "PAUSED" ? "ACTIVE" : plan.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    try {
      setTogglingPlanId(plan.id);
      const response = await fetch(`/api/installments/${plan.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update plan status");
      }

      const json = (await response.json()) as { data?: InstallmentPlan };
      if (json.data) {
        setPlans((current) =>
          current.map((item) => (item.id === json.data?.id ? (json.data as InstallmentPlan) : item))
        );
      }
    } catch {
      showToast("error", "Could not update plan status.");
    } finally {
      setTogglingPlanId(null);
    }
  }

  async function handleAdjustProgress(plan: InstallmentPlan) {
    const paidAmountText = window.prompt("Set paid amount", plan.paidAmount.toString());
    if (paidAmountText === null) {
      return;
    }

    const paidInstallmentsText = window.prompt(
      "Set paid installments",
      plan.paidInstallments.toString()
    );
    if (paidInstallmentsText === null) {
      return;
    }

    const paidAmount = Number(paidAmountText);
    const paidInstallments = Number(paidInstallmentsText);

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      showToast("error", "Paid amount cannot be negative.");
      return;
    }

    if (!Number.isInteger(paidInstallments) || paidInstallments < 0) {
      showToast("error", "Paid installments cannot be negative.");
      return;
    }

    try {
      setAdjustingPlanId(plan.id);
      const response = await fetch(`/api/installments/${plan.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paidAmount, paidInstallments }),
      });

      if (!response.ok) {
        throw new Error("Failed to adjust progress");
      }

      const json = (await response.json()) as { data?: InstallmentPlan };
      if (json.data) {
        setPlans((current) =>
          current.map((item) => (item.id === json.data?.id ? (json.data as InstallmentPlan) : item))
        );
      }

      showToast("success", "Plan progress updated.");
    } catch {
      showToast("error", "Could not update plan progress.");
    } finally {
      setAdjustingPlanId(null);
    }
  }

  async function handleDeletePlan(planId: string) {
    const confirmed = window.confirm(
      "Delete this installment plan and its payment history? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPlanId(planId);
      const response = await fetch(`/api/installments/${planId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete installment plan");
      }

      setPlans((current) => current.filter((item) => item.id !== planId));
      showToast("success", "Installment plan deleted.");
    } catch {
      showToast("error", "Could not delete installment plan.");
    } finally {
      setDeletingPlanId(null);
    }
  }

  function autofillInstallmentAmount() {
    const totalAmount = Number(form.totalAmount);
    const totalInstallments = Number(form.totalInstallments);

    if (
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0 ||
      !Number.isInteger(totalInstallments) ||
      totalInstallments <= 0
    ) {
      showToast("error", "Provide total amount and installment count first.");
      return;
    }

    const installment = totalAmount / totalInstallments;
    setForm((current) => ({
      ...current,
      installmentAmount: installment.toFixed(2),
    }));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Installment tracking</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track payment plans, progress, and account-linked payment history.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {(["ALL", "ACTIVE", "PAUSED", "COMPLETED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active plans" value={stats.active.toString()} icon={<Clock3 className="h-4 w-4" />} />
        <StatCard label="Due this week" value={stats.dueSoon.toString()} icon={<ReceiptText className="h-4 w-4" />} />
        <StatCard label="Completed" value={stats.completed.toString()} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.totalOutstanding, preferredCurrency)}
          icon={<RotateCcw className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-4" onSubmit={handleCreatePlan}>
          <Field label="Plan title">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Phone installment, laptop plan..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total amount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, totalAmount: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="0.00"
              />
            </Field>
            <Field label="Installment amount">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.installmentAmount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, installmentAmount: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={autofillInstallmentAmount}
                  className="rounded-2xl border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Auto
                </button>
              </div>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Installments">
              <input
                type="number"
                min="1"
                step="1"
                value={form.totalInstallments}
                onChange={(event) =>
                  setForm((current) => ({ ...current, totalInstallments: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
            <Field label="Frequency">
              <select
                value={form.frequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    frequency: event.target.value as RecurrenceFrequency,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="DAILY">Daily</option>
              </select>
            </Field>
            <Field label="Interval">
              <input
                type="number"
                min="1"
                step="1"
                value={form.interval}
                onChange={(event) => setForm((current) => ({ ...current, interval: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({ ...current, currency: event.target.value as Currency }))
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
            <Field label="Account type">
              <select
                value={form.accountType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accountType: event.target.value as AccountType }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="DEBIT">Debit account</option>
                <option value="CREDIT">Credit account</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
            <Field label="Next due date">
              <input
                type="date"
                value={form.nextDueDate}
                onChange={(event) => setForm((current) => ({ ...current, nextDueDate: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paid amount (optional)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.paidAmount}
                onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
            <Field label="Paid installments (optional)">
              <input
                type="number"
                min="0"
                step="1"
                value={form.paidInstallments}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paidInstallments: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </Field>
          </div>

          <Field label="Source account (optional)">
            <CategoryCombobox
              value={form.sourceAccount}
              onChange={(value) => setForm((current) => ({ ...current, sourceAccount: value }))}
              options={accountOptions}
              placeholder="Cash, Visa Credit, BPI..."
            />
          </Field>

          <Field label="Note (optional)">
            <input
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Any context for this plan"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save installment plan
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
                  height={176}
                  className="rounded-2xl"
                />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No installment plans for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => {
                const amountProgress =
                  plan.totalAmount > 0
                    ? Math.min(100, (plan.paidAmount / plan.totalAmount) * 100)
                    : 0;
                const installmentProgress =
                  plan.totalInstallments > 0
                    ? Math.min(100, (plan.paidInstallments / plan.totalInstallments) * 100)
                    : 0;
                const isPaymentOpen = openPaymentPlanId === plan.id;

                return (
                  <article
                    key={plan.id}
                    className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{plan.title}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(plan.status)}`}>
                            {plan.status}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            plan.accountType === "CREDIT"
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                          }`}>
                            {plan.accountType}
                          </span>
                          {plan.overpaidAmount > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                              Prepaid {formatCurrency(plan.overpaidAmount, plan.currency)}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {formatCurrency(plan.paidAmount, plan.currency)} paid / {formatCurrency(plan.totalAmount, plan.currency)} total
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {plan.paidInstallments}/{plan.totalInstallments} installments • Next due {formatDate(plan.nextDueDate)} • Every {plan.interval} {plan.frequency.toLowerCase()}{plan.interval > 1 ? "s" : ""}
                        </p>
                        {plan.sourceAccount ? (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Account: {plan.sourceAccount}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(plan)}
                          disabled={togglingPlanId === plan.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {togglingPlanId === plan.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : plan.status === "PAUSED" ? (
                            <PlayCircle className="h-3.5 w-3.5" />
                          ) : (
                            <PauseCircle className="h-3.5 w-3.5" />
                          )}
                          {plan.status === "PAUSED" ? "Resume" : "Pause"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdjustProgress(plan)}
                          disabled={adjustingPlanId === plan.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {adjustingPlanId === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Adjust
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={deletingPlanId === plan.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                          aria-label="Delete installment plan"
                        >
                          {deletingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <ProgressRow
                        label="Amount"
                        left={`${amountProgress.toFixed(1)}%`}
                        right={`${formatCurrency(plan.remainingAmount, plan.currency)} remaining`}
                        value={amountProgress}
                      />
                      <ProgressRow
                        label="Installments"
                        left={`${installmentProgress.toFixed(1)}%`}
                        right={`${plan.remainingInstallments} remaining`}
                        value={installmentProgress}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => (isPaymentOpen ? setOpenPaymentPlanId(null) : openPaymentForm(plan))}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Log payment
                      </button>
                    </div>

                    {isPaymentOpen ? (
                      <form
                        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40"
                        onSubmit={(event) => handleLogPayment(plan, event)}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Amount">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(event) =>
                                setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </Field>
                          <Field label="Installments covered">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={paymentForm.installmentsCovered}
                              onChange={(event) =>
                                setPaymentForm((current) => ({
                                  ...current,
                                  installmentsCovered: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </Field>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label="Paid date">
                            <input
                              type="date"
                              value={paymentForm.paidAt}
                              onChange={(event) =>
                                setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </Field>
                          <Field label="Source account (optional)">
                            <CategoryCombobox
                              value={paymentForm.sourceAccount}
                              onChange={(value) =>
                                setPaymentForm((current) => ({ ...current, sourceAccount: value }))
                              }
                              options={accountOptions}
                              placeholder="Use plan account"
                            />
                          </Field>
                        </div>

                        <Field label="Note (optional)">
                          <input
                            value={paymentForm.note}
                            onChange={(event) =>
                              setPaymentForm((current) => ({ ...current, note: event.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            placeholder="Optional payment note"
                          />
                        </Field>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={paymentForm.createLinkedTransaction}
                              onChange={(event) =>
                                setPaymentForm((current) => ({
                                  ...current,
                                  createLinkedTransaction: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Create linked transaction entry
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={paymentForm.advanceNextDue}
                              onChange={(event) =>
                                setPaymentForm((current) => ({
                                  ...current,
                                  advanceNextDue: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Advance next due date automatically
                          </label>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={loggingPaymentPlanId === plan.id}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loggingPaymentPlanId === plan.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Save payment
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenPaymentPlanId(null)}
                            className="rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {plan.payments.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Recent payments
                        </p>
                        <div className="space-y-2">
                          {plan.payments.slice(0, 4).map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {formatCurrency(payment.amount, payment.currency)}
                                  {payment.installmentsCovered > 0
                                    ? ` • ${payment.installmentsCovered} installment${payment.installmentsCovered > 1 ? "s" : ""}`
                                    : ""}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDate(payment.paidAt)}
                                  {payment.sourceAccount ? ` • ${payment.sourceAccount}` : ""}
                                  {payment.linkedTransactionId ? " • Linked" : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(plan.id, payment.id)}
                                disabled={deletingPaymentId === payment.id}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                                aria-label="Delete installment payment"
                              >
                                {deletingPaymentId === payment.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className="text-slate-500 dark:text-slate-300">{icon}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </article>
  );
}

function ProgressRow({
  label,
  left,
  right,
  value,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}: {left}</span>
        <span>{right}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function statusBadgeClass(status: InstallmentStatus) {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "PAUSED") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function formatCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
