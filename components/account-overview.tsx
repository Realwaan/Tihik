"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, Loader2, Trash2, WalletCards, Wallet, Landmark, Smartphone, MoreHorizontal } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";

import { useToast } from "@/components/toast-provider";
import { WalletLogoDot } from "@/components/ui/wallet-logo-dot";
import { getAccountCardTheme } from "@/lib/account-card-theme";
import { getWalletBadge } from "@/lib/wallet-badges";

const ACCOUNT_OVERVIEW_ORDER_STORAGE_KEY = "trackit.account-overview.order.v1";

type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type Transaction = {
  id: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  category: string;
  sourceAccount?: string | null;
  destinationAccount?: string | null;
  note?: string | null;
  date: string;
};

type DashboardData = {
  walletBreakdown: {
    cashBalance: number;
    ewallets: Array<{ category: string; balance: number }>;
    banks: Array<{ category: string; balance: number }>;
    uncategorizedAccounts: Array<{ category: string; balance: number }>;
  };
};

type AccountCard = {
  id: string;
  account: string;
  balance: number;
  group: "cash" | "ewallet" | "bank" | "other";
};

export function AccountOverview() {
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

    const normalized = selectedAccount.trim().toLowerCase();
    return transactions.filter((item) => {
      const source = item.sourceAccount?.trim().toLowerCase() ?? "";
      const destination = item.destinationAccount?.trim().toLowerCase() ?? "";
      const category = item.category.trim().toLowerCase();
      return source === normalized || destination === normalized || category === normalized;
    });
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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Account Overview</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review account balances, account-level history, and quick actions.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Net worth</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(debitNetWorth, preferredCurrency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {netWorthChangePercent === null
              ? "No previous-day baseline"
              : `${netWorthChangePercent >= 0 ? "+" : ""}${netWorthChangePercent.toFixed(1)}% vs previous day`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedAccount("ALL")}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            selectedAccount === "ALL"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All accounts
        </button>
        {orderedAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => setSelectedAccount(account.account)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              selectedAccount === account.account
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {account.account}
          </button>
        ))}
      </div>

      {selectedAccount !== "ALL" ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 dark:border-rose-800/60 dark:bg-rose-900/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm text-rose-800 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              Force delete will remove this account and all linked activities.
            </p>
            <button
              type="button"
              onClick={handleForceDeleteAccount}
              disabled={forceDeleting}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/40"
            >
              {forceDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Force delete account
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        Drag cards to rearrange, or use the menu on each card. Order is saved on this device.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              animation="wave"
              height={182}
              className="rounded-2xl"
            />
          ))
        ) : orderedAccounts.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No account data available yet.
          </div>
        ) : (
          orderedAccounts.map((account) => {
            const badge = getWalletBadge(account.account);
            const resolvedGroup: "cash" | "ewallet" | "bank" =
              account.group === "cash"
                ? "cash"
                : account.group === "ewallet"
                  ? "ewallet"
                  : account.group === "bank"
                    ? "bank"
                    : badge?.kind === "wallet"
                      ? "ewallet"
                      : "bank";
            const cardTheme = getAccountCardTheme(account.account, resolvedGroup);
            const groupLabel =
              resolvedGroup === "cash"
                ? "Cash"
                : resolvedGroup === "ewallet"
                  ? "E-wallet"
                  : "Bank";
            const orderIndex = orderedAccountIds.indexOf(account.id);
            const isFirst = orderIndex <= 0;
            const isLast = orderIndex === orderedAccountIds.length - 1;
            const Icon =
              resolvedGroup === "cash"
                ? Wallet
                : resolvedGroup === "ewallet"
                  ? Smartphone
                  : Landmark;

            return (
              <article
                key={account.id}
                draggable
                onDragStart={() => {
                  setDraggingAccountId(account.id);
                  setOpenAccountMenuId(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggingAccountId) {
                    reorderAccounts(draggingAccountId, account.id);
                  }
                  setDraggingAccountId(null);
                }}
                onDragEnd={() => setDraggingAccountId(null)}
                className={`relative min-h-[182px] cursor-move overflow-hidden rounded-3xl border p-4 sm:p-5 ${cardTheme.cardClass} ${draggingAccountId === account.id ? "ring-2 ring-white/40 opacity-80" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex min-w-0 items-start gap-3">
                    {badge ? (
                      <WalletLogoDot
                        badge={badge}
                        label={account.account}
                        sizeClass="h-10 w-10"
                        textClass="text-[10px]"
                        imageClassName="absolute inset-[2px] h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-full bg-white object-contain p-[2px]"
                      />
                    ) : (
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${cardTheme.fallbackLogoClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className={`truncate text-lg font-semibold ${cardTheme.titleClass}`}>{account.account}</p>
                      <p className={`text-sm ${cardTheme.subtitleClass}`}>
                        {account.balance >= 0 ? "Debit" : "Credit"} • {preferredCurrency}
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center gap-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${cardTheme.pillClass}`}
                    >
                      {groupLabel}
                    </span>
                    <button
                      type="button"
                      aria-label="Account card actions"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpenAccountMenuId((current) =>
                          current === account.id ? null : account.id
                        );
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${cardTheme.pillClass}`}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {openAccountMenuId === account.id ? (
                      <div
                        className="absolute right-0 top-9 z-20 min-w-[9.5rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            moveAccountToEdge(account.id, "top");
                            setOpenAccountMenuId(null);
                          }}
                          className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Move to top
                        </button>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            moveAccountByStep(account.id, "up");
                            setOpenAccountMenuId(null);
                          }}
                          className="mt-1 block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            moveAccountByStep(account.id, "down");
                            setOpenAccountMenuId(null);
                          }}
                          className="mt-1 block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            moveAccountToEdge(account.id, "bottom");
                            setOpenAccountMenuId(null);
                          }}
                          className="mt-1 block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Move to bottom
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-7">
                  <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${cardTheme.balanceLabelClass}`}>Balance</p>
                  <p className={`mt-1 text-3xl font-semibold tracking-tight ${cardTheme.balanceValueClass}`}>
                    {formatCurrency(account.balance, preferredCurrency)}
                  </p>
                </div>
                <Icon className={`pointer-events-none absolute bottom-3 right-3 h-12 w-12 ${cardTheme.watermarkClass}`} />
              </article>
            );
          })
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account transaction history</h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                animation="wave"
                height={62}
                className="rounded-2xl"
              />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No account-level transactions found for this filter.
          </div>
        ) : (
          <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
            {filteredTransactions.map((transaction) => (
              <article
                key={transaction.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-700"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{transaction.category}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(transaction.date).toLocaleDateString()} • {transaction.sourceAccount || "No source"}
                    {transaction.destinationAccount ? ` -> ${transaction.destinationAccount}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    transaction.type === "INCOME"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : transaction.type === "EXPENSE"
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-amber-700 dark:text-amber-300"
                  }`}>
                    {transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "-" : "↔ "}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(transaction.id)}
                    disabled={duplicatingId === transaction.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                    aria-label="Duplicate transaction"
                  >
                    {duplicatingId === transaction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(transaction.id)}
                    disabled={deletingId === transaction.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                    aria-label="Delete transaction"
                  >
                    {deletingId === transaction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function computeDebitNetWorth(rows: Transaction[], endDateExclusive?: Date) {
  const balances = new Map<string, number>();

  function applySignedAmount(accountName: string | null | undefined, signedAmount: number) {
    const account = accountName?.trim();
    if (!account || !signedAmount) return;
    balances.set(account, (balances.get(account) ?? 0) + signedAmount);
  }

  for (const row of rows) {
    const amount = row.amount ?? 0;
    if (!amount) continue;

    if (endDateExclusive) {
      const rowDate = new Date(row.date);
      if (rowDate >= endDateExclusive) {
        continue;
      }
    }

    if (row.type === "TRANSFER") {
      applySignedAmount(row.sourceAccount || row.category, -amount);
      applySignedAmount(row.destinationAccount, amount);
      continue;
    }

    const direction = row.type === "INCOME" ? 1 : -1;
    applySignedAmount(row.sourceAccount || row.category, amount * direction);
  }

  return Array.from(balances.values())
    .filter((value) => value >= 0)
    .reduce((sum, value) => sum + value, 0);
}

function formatCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}
