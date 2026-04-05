"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCcw, Trash2, Users } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { WalletCategoryBadge } from "@/components/ui/wallet-category-badge";
import { mergeCategories } from "@/lib/categories";

type Household = {
  membershipId: string;
  role: "OWNER" | "MEMBER";
  household: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      role: "OWNER" | "MEMBER";
      user: {
        id: string;
        name: string | null;
        email: string | null;
      };
    }>;
  };
};

type SharedExpense = {
  id: string;
  householdId: string;
  amount: number;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  category: string;
  description?: string | null;
  date: string;
  paidByUser: {
    id: string;
    name: string | null;
    email: string | null;
  };
};


const USD_RATES: Record<SharedExpense["currency"], number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.66,
  PHP: 0.018,
};

function convertFromUsd(amountUsd: number, targetCurrency: SharedExpense["currency"]) {
  const rate = USD_RATES[targetCurrency];
  const value = amountUsd / rate;
  return targetCurrency === "JPY" ? Math.round(value) : Number(value.toFixed(2));
}

type SettlementResponse = {
  balancesUsd: Array<{
    userId: string;
    name: string;
    balanceUsd: number;
  }>;
  suggestions: Array<{
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
    amountUsd: number;
  }>;
};

type SettlementPayment = {
  id: string;
  householdId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountUsd: number;
  status: "PENDING" | "PAID";
  dueDate: string;
  lastReminderAt: string | null;
  reminderCount: number;
  paidAt: string | null;
  note?: string | null;
};

type CollaborationAuditEvent = {
  id: string;
  householdId: string;
  action: string;
  details?: string | null;
  actorUserId: string;
  actorName: string;
  targetUserId?: string | null;
  targetName?: string | null;
  createdAt: string;
};

export function CollaborationManager() {
  const { showToast } = useToast();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("");
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingHouseholdId, setDeletingHouseholdId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    currency: "USD" as "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);
  const [preferredCurrency, setPreferredCurrency] =
    useState<SharedExpense["currency"]>("USD");
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);
  const [trackingPaymentKey, setTrackingPaymentKey] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<CollaborationAuditEvent[]>([]);

  async function loadHouseholds() {
    try {
      setLoading(true);
      const response = await fetch("/api/collaboration/households");
      if (!response.ok) throw new Error("Failed");
      const json = await response.json();
      const data = (json.data ?? []) as Household[];
      setHouseholds(data);
      if (!selectedHouseholdId && data[0]?.household?.id) {
        setSelectedHouseholdId(data[0].household.id);
      }
    } catch {
      showToast("error", "Failed to load collaboration groups.");
    } finally {
      setLoading(false);
    }
  }

  async function loadExpenses(householdId: string) {
    if (!householdId) {
      setExpenses([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/collaboration/expenses?householdId=${encodeURIComponent(
          householdId
        )}`
      );
      if (!response.ok) throw new Error("Failed");
      const json = await response.json();
      setExpenses((json.data ?? []) as SharedExpense[]);
      await Promise.all([
        loadSettlement(householdId),
        loadSettlementPayments(householdId),
        loadAuditEvents(householdId),
      ]);
    } catch {
      showToast("error", "Failed to load shared expenses.");
    }
  }

  async function loadSettlementPayments(householdId: string) {
    try {
      const response = await fetch(
        `/api/collaboration/settlements/payments?householdId=${encodeURIComponent(
          householdId
        )}`
      );
      if (!response.ok) throw new Error("Failed");
      const json = await response.json();
      setSettlementPayments((json.data ?? []) as SettlementPayment[]);
    } catch {
      setSettlementPayments([]);
    }
  }

  async function loadAuditEvents(householdId: string) {
    try {
      const response = await fetch(
        `/api/collaboration/audit?householdId=${encodeURIComponent(householdId)}`
      );
      if (!response.ok) throw new Error("Failed");
      const json = await response.json();
      setAuditEvents((json.data ?? []) as CollaborationAuditEvent[]);
    } catch {
      setAuditEvents([]);
    }
  }

  async function loadSettlement(householdId: string) {
    try {
      const response = await fetch(
        `/api/collaboration/settlements?householdId=${encodeURIComponent(
          householdId
        )}`
      );
      if (!response.ok) {
        throw new Error("Failed");
      }
      const json = await response.json();
      setSettlement(json.data as SettlementResponse);
    } catch {
      setSettlement(null);
    }
  }

  useEffect(() => {
    loadHouseholds();
    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return;
        const json = await response.json();
        setCurrentUserId((json.user?.id as string | undefined) ?? "");
        const currency = (json.user?.preferredCurrency ?? "USD") as SharedExpense["currency"];
        setPreferredCurrency(currency);
        setExpenseForm((current) => ({ ...current, currency }));
      } catch {
        // ignore preference load errors
      }
    }
    loadPreference();
  }, []);

  useEffect(() => {
    if (selectedHouseholdId) {
      loadExpenses(selectedHouseholdId);
    }
  }, [selectedHouseholdId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadHouseholds();
      if (selectedHouseholdId) {
        loadExpenses(selectedHouseholdId);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedHouseholdId]);

  useEffect(() => {
    setAllCategories(mergeCategories(expenses.map((item) => item.category), "expense"));
  }, [expenses]);

  const selectedHousehold = useMemo(
    () => households.find((item) => item.household.id === selectedHouseholdId),
    [households, selectedHouseholdId]
  );

  async function createHousehold(event: FormEvent) {
    event.preventDefault();
    if (!householdName.trim()) {
      showToast("error", "Household name is required.");
      return;
    }

    try {
      setCreatingHousehold(true);
      const response = await fetch("/api/collaboration/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName.trim() }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Failed");
      }
      setHouseholdName("");
      await loadHouseholds();
      showToast("success", "Household created.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to create household.");
    } finally {
      setCreatingHousehold(false);
    }
  }

  async function refreshCollaborationData() {
    try {
      setRefreshing(true);
      await loadHouseholds();
      if (selectedHouseholdId) {
        await loadExpenses(selectedHouseholdId);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function inviteMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedHouseholdId || !inviteEmail.trim()) {
      showToast("error", "Select a household and enter email.");
      return;
    }

    try {
      setInviting(true);
      const response = await fetch("/api/collaboration/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: selectedHouseholdId,
          email: inviteEmail.trim(),
        }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Failed");
      }
      setInviteEmail("");
      await loadHouseholds();
      showToast("success", "Member invited.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to invite member.");
    } finally {
      setInviting(false);
    }
  }

  async function deleteHousehold(householdId: string) {
    try {
      setDeletingHouseholdId(householdId);
      const response = await fetch(`/api/collaboration/households/${householdId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed");
      }

      if (selectedHouseholdId === householdId) {
        setSelectedHouseholdId("");
        setExpenses([]);
        setSettlement(null);
      }

      await loadHouseholds();
      showToast("success", "Household deleted.");
    } catch {
      showToast("error", "Failed to delete household.");
    } finally {
      setDeletingHouseholdId(null);
    }
  }

  async function addExpense(event: FormEvent) {
    event.preventDefault();
    if (!selectedHouseholdId) {
      showToast("error", "Select a household first.");
      return;
    }

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("error", "Amount must be greater than 0.");
      return;
    }

    if (!expenseForm.category.trim()) {
      showToast("error", "Category is required.");
      return;
    }

    try {
      setAddingExpense(true);
      const response = await fetch("/api/collaboration/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: selectedHouseholdId,
          amount,
          category: expenseForm.category.trim(),
          currency: expenseForm.currency,
          description: expenseForm.description.trim() || null,
          date: expenseForm.date,
        }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Failed");
      }

        setExpenseForm({
          amount: "",
          currency: preferredCurrency,
          category: "",
          description: "",
          date: new Date().toISOString().slice(0, 10),
        });
      await loadExpenses(selectedHouseholdId);
      showToast("success", "Shared expense added.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to add shared expense.");
    } finally {
      setAddingExpense(false);
    }
  }

  async function deleteExpense(id: string) {
    try {
      setDeletingExpenseId(id);
      const response = await fetch(`/api/collaboration/expenses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed");
      setExpenses((current) => current.filter((item) => item.id !== id));
      if (selectedHouseholdId) {
        await Promise.all([
          loadSettlement(selectedHouseholdId),
          loadSettlementPayments(selectedHouseholdId),
        ]);
      }
      showToast("success", "Shared expense deleted.");
    } catch {
      showToast("error", "Failed to delete shared expense.");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function createSettlementPayment(suggestion: SettlementResponse["suggestions"][number]) {
    if (!selectedHouseholdId) {
      showToast("error", "Select a household first.");
      return;
    }

    const key = `${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.amountUsd}`;

    try {
      setTrackingPaymentKey(key);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const response = await fetch("/api/collaboration/settlements/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: selectedHouseholdId,
          fromUserId: suggestion.fromUserId,
          toUserId: suggestion.toUserId,
          amountUsd: suggestion.amountUsd,
          dueDate: dueDate.toISOString(),
          note: `Settlement from suggested balance between ${suggestion.fromName} and ${suggestion.toName}`,
        }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Failed");
      }

      await loadSettlementPayments(selectedHouseholdId);
      await loadAuditEvents(selectedHouseholdId);
      showToast("success", "Settlement payment is now being tracked.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Failed to track settlement payment."
      );
    } finally {
      setTrackingPaymentKey(null);
    }
  }

  async function updateSettlementPaymentStatus(
    paymentId: string,
    action: "SEND_REMINDER" | "MARK_PAID" | "MARK_PENDING"
  ) {
    if (!selectedHouseholdId) return;

    try {
      setUpdatingPaymentId(paymentId);
      const response = await fetch(`/api/collaboration/settlements/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Failed");
      }

      await loadSettlementPayments(selectedHouseholdId);
      await loadAuditEvents(selectedHouseholdId);
      if (action === "SEND_REMINDER") {
        showToast("success", "Settlement reminder sent.");
      } else if (action === "MARK_PAID") {
        showToast("success", "Marked as paid.");
      } else {
        showToast("success", "Marked as pending.");
      }
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Failed to update settlement payment."
      );
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Collaboration groups
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a household and share expenses with members.
        </p>

        <form onSubmit={createHousehold} className="mt-6 space-y-3">
          <input
            value={householdName}
            onChange={(event) => setHouseholdName(event.target.value)}
            placeholder="Household name"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={creatingHousehold}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 sm:w-auto"
          >
            {creatingHousehold ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create household
          </button>
        </form>

        <div className="mt-6">
          {loading ? (
            <Skeleton
              variant="rounded"
              animation="wave"
              height={96}
              className="rounded-2xl"
            />
          ) : households.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No households yet.
            </div>
          ) : (
            <div className="space-y-2">
              {households.map((item) => (
                <article
                  key={item.household.id}
                  className={`rounded-2xl border px-3 py-3 transition ${
                    selectedHouseholdId === item.household.id
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedHouseholdId(item.household.id)}
                      className="flex-1 rounded-xl px-1 py-0.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.household.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.household.members.length} member(s) • role: {item.role}
                      </p>
                    </button>

                    {item.role === "OWNER" ? (
                      <button
                        type="button"
                        onClick={() => deleteHousehold(item.household.id)}
                        disabled={deletingHouseholdId === item.household.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        aria-label="Delete household"
                      >
                        {deletingHouseholdId === item.household.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={refreshCollaborationData}
            disabled={refreshing}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Refresh households
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Shared expenses
          </h2>
        </div>

        {!selectedHousehold ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Select a household to manage members and expenses.
          </p>
        ) : (
          <>
            <form onSubmit={inviteMember} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Invite member by email"
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <Button
                type="submit"
                disabled={inviting}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </form>

            <div className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Members with access</p>
              <p className="mt-1">Everyone listed below can view shared expenses for this household.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedHousehold.household.members.map((member) => (
                  <span
                    key={member.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {member.user.name || member.user.email || "User"} ({member.role})
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={addExpense} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="Amount"
                className="rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <CategoryCombobox
                value={expenseForm.category}
                onChange={(value) =>
                  setExpenseForm((current) => ({
                    ...current,
                    category: value,
                  }))
                }
                options={allCategories}
                placeholder="Category"
              />
              <select
                value={expenseForm.currency}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    currency: event.target.value as SharedExpense["currency"],
                  }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="PHP">PHP</option>
              </select>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <input
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Description (optional)"
                className="rounded-2xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={addingExpense}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {addingExpense ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add shared expense
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {expenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No shared expenses yet.
                </div>
              ) : (
                expenses.map((expense) => (
                  <article
                    key={expense.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{expense.category}</p>
                        <WalletCategoryBadge category={expense.category} />
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {expense.description || "No description"} • Paid by{" "}
                        {expense.paidByUser.name || expense.paidByUser.email || "User"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteExpense(expense.id)}
                      disabled={deletingExpenseId === expense.id}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      aria-label="Delete shared expense"
                    >
                      {deletingExpenseId === expense.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </article>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Settlement suggestions ({preferredCurrency})
              </h3>
              {settlement && settlement.suggestions.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {settlement.suggestions.map((item, idx) => (
                    <div
                      key={`${item.fromUserId}-${item.toUserId}-${idx}`}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {item.fromName} pays {item.toName}{" "}
                        <span className="font-medium">
                          {formatCurrency(convertFromUsd(item.amountUsd, preferredCurrency), preferredCurrency)}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => createSettlementPayment(item)}
                        disabled={
                          trackingPaymentKey ===
                          `${item.fromUserId}-${item.toUserId}-${item.amountUsd}`
                        }
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {trackingPaymentKey ===
                        `${item.fromUserId}-${item.toUserId}-${item.amountUsd}`
                          ? "Tracking..."
                          : "Track payment"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No settlements needed right now.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Payment tracking & reminders
              </h3>
              {settlementPayments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {settlementPayments.map((payment) => {
                    const isPending = payment.status === "PENDING";
                    const isPayer = currentUserId === payment.fromUserId;
                    const isPayee = currentUserId === payment.toUserId;
                    return (
                      <div
                        key={payment.id}
                        className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {payment.fromName} owes {payment.toName} {" "}
                              {formatCurrency(
                                convertFromUsd(payment.amountUsd, preferredCurrency),
                                preferredCurrency
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Due {new Date(payment.dueDate).toLocaleDateString()} • Status: {payment.status}
                              {payment.reminderCount > 0
                                ? ` • ${payment.reminderCount} reminder${
                                    payment.reminderCount === 1 ? "" : "s"
                                  } sent`
                                : ""}
                            </p>
                            {payment.note ? (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {payment.note}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isPending && (isPayee || !isPayer) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSettlementPaymentStatus(payment.id, "SEND_REMINDER")
                                }
                                disabled={updatingPaymentId === payment.id}
                                className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                              >
                                Remind
                              </button>
                            ) : null}
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSettlementPaymentStatus(payment.id, "MARK_PAID")
                                }
                                disabled={updatingPaymentId === payment.id}
                                className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                              >
                                Mark paid
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSettlementPaymentStatus(payment.id, "MARK_PENDING")
                                }
                                disabled={updatingPaymentId === payment.id}
                                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No tracked settlement payments yet.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Collaboration audit history
              </h3>
              {auditEvents.length > 0 ? (
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {auditEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
                    >
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {event.actorName} • {event.action.replaceAll("_", " ")}
                      </p>
                      {event.details ? (
                        <p className="mt-1 text-slate-600 dark:text-slate-300">{event.details}</p>
                      ) : null}
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No audit events yet.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
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
