import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/toast-provider";
import type {
  AccountCard,
  Currency,
  DashboardData,
  Transaction,
} from "./account-overview-types";
import {
  ACCOUNT_OVERVIEW_ORDER_STORAGE_KEY,
  computeDebitNetWorth,
  isTransactionLinkedToAccount,
} from "./account-overview-utils";

export function useAccountOverview() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountCard[]>([]);
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>("USD");
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [accountOrder, setAccountOrder] = useState<string[]>([]);
  const [draggingAccountId, setDraggingAccountId] = useState<string | null>(null);
  const [openAccountMenuId, setOpenAccountMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [forceDeleting, setForceDeleting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [dashboardRes, transactionsRes, profileRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/transactions"),
        fetch("/api/user/profile"),
      ]);

      if (!dashboardRes.ok || !transactionsRes.ok) {
        throw new Error("Failed to load account data");
      }

      const dashboardJson = (await dashboardRes.json()) as { data: DashboardData };
      const transactionsJson = (await transactionsRes.json()) as { data?: Transaction[] };
      const profileJson = (await profileRes.json().catch(() => null)) as
        | { user?: { preferredCurrency?: Currency } }
        | null;

      setTransactions((transactionsJson.data ?? []) as Transaction[]);
      setPreferredCurrency(profileJson?.user?.preferredCurrency ?? "USD");

      const walletBreakdown = dashboardJson.data?.walletBreakdown;
      const nextAccounts: AccountCard[] = [
        {
          id: "cash",
          account: "Cash",
          balance: walletBreakdown?.cashBalance ?? 0,
          group: "cash" as const,
        },
        ...(walletBreakdown?.ewallets ?? []).map((item) => ({
          id: `ewallet-${item.category.toLowerCase()}`,
          account: item.category,
          balance: item.balance,
          group: "ewallet" as const,
        })),
        ...(walletBreakdown?.banks ?? []).map((item) => ({
          id: `bank-${item.category.toLowerCase()}`,
          account: item.category,
          balance: item.balance,
          group: "bank" as const,
        })),
        ...(walletBreakdown?.uncategorizedAccounts ?? []).map((item) => ({
          id: `other-${item.category.toLowerCase()}`,
          account: item.category,
          balance: item.balance,
          group: "other" as const,
        })),
      ]
        .filter((item) => item.account.trim().length > 0)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

      setAccounts(nextAccounts);
    } catch {
      showToast("error", "Unable to load account overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACCOUNT_OVERVIEW_ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setAccountOrder(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      // ignore invalid local storage values
    }
  }, []);

  const orderedAccounts = useMemo(() => {
    if (accounts.length === 0) {
      return accounts;
    }

    if (accountOrder.length === 0) {
      return accounts;
    }

    const accountMap = new Map(accounts.map((item) => [item.id, item]));
    const ordered = accountOrder
      .map((id) => accountMap.get(id))
      .filter((item): item is AccountCard => Boolean(item));
    const missing = accounts.filter((item) => !accountOrder.includes(item.id));
    return [...ordered, ...missing];
  }, [accounts, accountOrder]);

  const orderedAccountIds = useMemo(
    () => orderedAccounts.map((item) => item.id),
    [orderedAccounts]
  );

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    setAccountOrder((current) => {
      const availableIds = accounts.map((item) => item.id);
      const existing = current.filter((id) => availableIds.includes(id));
      const missing = availableIds.filter((id) => !existing.includes(id));
      const next = [...existing, ...missing];

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [accounts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ACCOUNT_OVERVIEW_ORDER_STORAGE_KEY,
        JSON.stringify(accountOrder)
      );
    } catch {
      // ignore storage write failures
    }
  }, [accountOrder]);

  const debitNetWorth = useMemo(() => computeDebitNetWorth(transactions), [transactions]);

  const previousDayDebitNetWorth = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return computeDebitNetWorth(transactions, todayStart);
  }, [transactions]);

  const netWorthChangePercent = useMemo(() => {
    if (Math.abs(previousDayDebitNetWorth) < 0.00001) {
      return debitNetWorth === 0 ? 0 : null;
    }

    return ((debitNetWorth - previousDayDebitNetWorth) / Math.abs(previousDayDebitNetWorth)) * 100;
  }, [debitNetWorth, previousDayDebitNetWorth]);

  function reorderAccounts(movingId: string, targetId: string) {
    if (movingId === targetId) {
      return;
    }

    setAccountOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : accounts.map((item) => item.id);
      const movingIndex = baseOrder.indexOf(movingId);
      const targetIndex = baseOrder.indexOf(targetId);

      if (movingIndex < 0 || targetIndex < 0) {
        return current;
      }

      baseOrder.splice(movingIndex, 1);
      baseOrder.splice(targetIndex, 0, movingId);
      return baseOrder;
    });
  }

  function moveAccountByStep(accountId: string, direction: "up" | "down") {
    setAccountOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : accounts.map((item) => item.id);
      const index = baseOrder.indexOf(accountId);

      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= baseOrder.length) {
        return current;
      }

      const [item] = baseOrder.splice(index, 1);
      baseOrder.splice(targetIndex, 0, item);
      return baseOrder;
    });
  }

  function moveAccountToEdge(accountId: string, edge: "top" | "bottom") {
    setAccountOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : accounts.map((item) => item.id);
      const index = baseOrder.indexOf(accountId);

      if (index < 0) {
        return current;
      }

      const [item] = baseOrder.splice(index, 1);
      if (edge === "top") {
        baseOrder.unshift(item);
      } else {
        baseOrder.push(item);
      }

      return baseOrder;
    });
  }

  const filteredTransactions = useMemo(() => {
    if (selectedAccount === "ALL") {
      return transactions;
    }

    return transactions.filter((item) =>
      isTransactionLinkedToAccount(item, selectedAccount)
    );
  }, [transactions, selectedAccount]);

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }
      setTransactions((current) => current.filter((item) => item.id !== id));
      showToast("success", "Transaction deleted.");
    } catch {
      showToast("error", "Could not delete transaction.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      setDuplicatingId(id);
      const response = await fetch(`/api/transactions/${id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate transaction");
      }

      const json = (await response.json().catch(() => null)) as { data?: Transaction } | null;
      if (json?.data) {
        setTransactions((current) => [json.data as Transaction, ...current]);
      } else {
        await loadData();
      }
      showToast("success", "Transaction duplicated.");
    } catch {
      showToast("error", "Could not duplicate transaction.");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleForceDeleteAccount() {
    if (!selectedAccount || selectedAccount === "ALL") {
      return;
    }

    const confirmed = window.confirm(
      `Force delete account "${selectedAccount}" and all linked activities? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setForceDeleting(true);
      const response = await fetch("/api/accounts/force-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: selectedAccount }),
      });

      if (!response.ok) {
        throw new Error("Failed to force delete account");
      }

      const json = (await response.json()) as {
        data?: {
          transactionsDeleted: number;
          recurringDeleted: number;
          budgetsDeleted: number;
          installmentPaymentsDeleted: number;
          installmentPlansDeleted: number;
        };
      };

      const deleted = json.data;
      showToast(
        "success",
        `Removed linked activities (transactions: ${deleted?.transactionsDeleted ?? 0}, recurring: ${deleted?.recurringDeleted ?? 0}, budgets: ${deleted?.budgetsDeleted ?? 0}, installment payments: ${deleted?.installmentPaymentsDeleted ?? 0}, installment plans: ${deleted?.installmentPlansDeleted ?? 0}).`
      );

      setSelectedAccount("ALL");
      await loadData();
    } catch {
      showToast("error", "Could not force delete account.");
    } finally {
      setForceDeleting(false);
    }
  }

  return {
    loading,
    transactions,
    preferredCurrency,
    selectedAccount,
    setSelectedAccount,
    orderedAccounts,
    orderedAccountIds,
    draggingAccountId,
    setDraggingAccountId,
    openAccountMenuId,
    setOpenAccountMenuId,
    deletingId,
    duplicatingId,
    forceDeleting,
    debitNetWorth,
    netWorthChangePercent,
    filteredTransactions,
    reorderAccounts,
    moveAccountByStep,
    moveAccountToEdge,
    handleDelete,
    handleDuplicate,
    handleForceDeleteAccount,
  };
}
