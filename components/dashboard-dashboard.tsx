"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, PieChart, RefreshCcw, Wallet, Target, Users, User, Bell, Landmark, Smartphone, CreditCard, MoreHorizontal } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MuiSkeleton from "@mui/material/Skeleton";

import { AccountOverviewCardTransactionsModal } from "@/components/account-overview/account-overview-card-transactions-modal";
import { isTransactionLinkedToAccount } from "@/components/account-overview/account-overview-utils";
import { SignOutButton } from "@/components/auth-buttons";
import { MobileNavDock } from "@/components/mobile-nav-dock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WalletBrandLogo } from "@/components/ui/wallet-brand-logo";
import { WalletCategoryBadge } from "@/components/ui/wallet-category-badge";
import { getAccountCardTheme } from "@/lib/account-card-theme";
import { isCreditCardLikeAccount } from "@/lib/bank-account-eligibility";
import { getWalletBadge } from "@/lib/wallet-badges";

type DashboardData = {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
  budgetSummary: Array<{
    id: string;
    category: string;
    limit: number;
    spent: number;
    usagePercent: number;
  }>;
  overBudgetCount: number;
  nearBudgetCount: number;
  monthlyTrend: Array<{
    month: string;
    label: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  monthOverMonth: {
    expenseChangePercent: number | null;
    incomeChangePercent: number | null;
  };
  cashflowForecast: Array<{
    month: string;
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
  }>;
  categoryDrilldown: Array<{
    month: string;
    label: string;
    values: Array<{
      category: string;
      amount: number;
    }>;
  }>;
  walletBreakdown: {
    cashBalance: number;
    ewalletBalance: number;
    bankBalance: number;
    otherBalance: number;
    ewallets: Array<{
      category: string;
      balance: number;
    }>;
    banks: Array<{
      category: string;
      balance: number;
    }>;
    uncategorizedAccounts: Array<{
      category: string;
      balance: number;
    }>;
  };
};

type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
type NotificationItem = {
  id: string;
  type:
    | "SMART_SPIKE_MONTH"
    | "SMART_LARGE_EXPENSE"
    | "SMART_CATEGORY_SURGE"
    | "BUDGET_OVER"
    | "BUDGET_NEAR"
    | "COLLAB_SETTLEMENT_REMINDER"
    | "COLLAB_SETTLEMENT_OVERDUE"
    | "RECURRING_MISSED_PAYMENT";
  severity: "info" | "warning";
  title: string;
  message: string;
  createdAt: string;
};

type TransactionLite = {
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category: string;
  sourceAccount?: string | null;
  destinationAccount?: string | null;
};

type AccountTransaction = {
  id: string;
  amount: number;
  currency: Currency;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category: string;
  sourceAccount?: string | null;
  destinationAccount?: string | null;
  note?: string | null;
  date: string;
  createdAt?: string;
};

type NotificationPreferences = {
  budgetNearEnabled: boolean;
  budgetOverEnabled: boolean;
  smartSpikeEnabled: boolean;
  smartLargeExpenseEnabled: boolean;
  smartCategorySurgeEnabled: boolean;
};

const palette = ["#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6", "#ef4444", "#22c55e"];
const READ_NOTIFICATIONS_STORAGE_KEY = "trackit.notifications.read.v1";
const ACCOUNT_ORDER_STORAGE_KEY = "trackit.dashboard.account-order.v1";

function toPseudoCardNumber(seed: string) {
  const digits = Array.from(seed).map((char) => char.charCodeAt(0) % 10);
  const padded = [...digits, 5, 2, 8, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 8].slice(0, 16);
  return `${padded.slice(0, 4).join("")} ${padded.slice(4, 8).join("")} ${padded
    .slice(8, 12)
    .join("")} ${padded.slice(12, 16).join("")}`;
}

function toPseudoExpiry(seed: string) {
  const digits = Array.from(seed).map((char) => char.charCodeAt(0));
  const month = ((digits[0] ?? 9) % 12) + 1;
  const year = ((digits[1] ?? 25) % 7) + 25;
  return `${String(month).padStart(2, "0")}/${String(year).padStart(2, "0")}`;
}

function Skeleton(props: React.ComponentProps<typeof MuiSkeleton>) {
  const { sx, ...rest } = props;
  const mergedSx = Array.isArray(sx)
    ? [{ "&::after": { animationDuration: "1.9s" } }, ...sx]
    : sx
      ? [{ "&::after": { animationDuration: "1.9s" } }, sx]
      : { "&::after": { animationDuration: "1.9s" } };

  return (
    <MuiSkeleton
      {...rest}
      sx={mergedSx}
    />
  );
}

export function DashboardDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>("USD");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [savingPreferenceKey, setSavingPreferenceKey] = useState<keyof NotificationPreferences | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [accountView, setAccountView] = useState<"ALL" | "DEBIT" | "CREDIT">("ALL");
  const [accountCardsAnimated, setAccountCardsAnimated] = useState(true);
  const [accountOrder, setAccountOrder] = useState<string[]>([]);
  const [draggingAccountId, setDraggingAccountId] = useState<string | null>(null);
  const [openAccountMenuId, setOpenAccountMenuId] = useState<string | null>(null);
  const [selectedAccountCardId, setSelectedAccountCardId] = useState<string | null>(null);
  const [allAccountTransactions, setAllAccountTransactions] = useState<AccountTransaction[] | null>(null);
  const [loadingAccountTransactions, setLoadingAccountTransactions] = useState(false);
  const [accountTransactionsError, setAccountTransactionsError] = useState<string | null>(null);
  const [previousDebitNetWorth, setPreviousDebitNetWorth] = useState<number | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const json = await response.json();
        setData(json.data as DashboardData);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Unable to load dashboard right now.");
        }
      } finally {
        setLoading(false);
      }
    }

    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile", {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const json = await response.json();
        const currency = (json.user?.preferredCurrency ?? "USD") as Currency;
        setPreferredCurrency(currency);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          // ignore
        }
      }
    }

    async function loadPreviousDayNetWorth() {
      try {
        const today = new Date();
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const yesterdayEnd = new Date(todayStart.getTime() - 1);
        const response = await fetch(
          `/api/transactions?endDate=${encodeURIComponent(yesterdayEnd.toISOString())}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          return;
        }
        const json = await response.json();
        const rows = (json.data ?? []) as TransactionLite[];
        setPreviousDebitNetWorth(computeDebitNetWorth(rows));
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setPreviousDebitNetWorth(null);
        }
      }
    }

    loadDashboard();
    loadPreference();
    loadPreviousDayNetWorth();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setReadNotificationIds(new Set(parsed.filter((value): value is string => typeof value === "string")));
      }
    } catch {
      // ignore invalid local storage values
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACCOUNT_ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setAccountOrder(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      // ignore invalid local storage values
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        READ_NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(Array.from(readNotificationIds))
      );
    } catch {
      // ignore storage write failures
    }
  }, [readNotificationIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [notificationsOpen]);

  const chartData = useMemo(() => data?.expensesByCategory ?? [], [data]);
  const trendData = useMemo(() => data?.monthlyTrend ?? [], [data]);
  const forecastData = useMemo(() => data?.cashflowForecast ?? [], [data]);
  const drilldownData = useMemo(() => data?.categoryDrilldown ?? [], [data]);
  const accountCards = useMemo(() => {
    const cards: Array<{
      id: string;
      category: string;
      group: "cash" | "ewallet" | "bank";
      balance: number;
    }> = [];

    const walletBreakdown = data?.walletBreakdown;
    if (!walletBreakdown) return cards;

    cards.push({
      id: "cash",
      category: "Cash",
      group: "cash",
      balance: walletBreakdown.cashBalance,
    });

    walletBreakdown.ewallets.forEach((item) => {
      cards.push({
        id: `ewallet-${item.category}`,
        category: item.category,
        group: "ewallet",
        balance: item.balance,
      });
    });

    walletBreakdown.banks.forEach((item) => {
      cards.push({
        id: `bank-${item.category}`,
        category: item.category,
        group: "bank",
        balance: item.balance,
      });
    });

    return cards.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [data]);

  const orderedAccountCards = useMemo(() => {
    if (accountCards.length === 0) {
      return accountCards;
    }

    if (accountOrder.length === 0) {
      return accountCards;
    }

    const cardMap = new Map(accountCards.map((item) => [item.id, item]));
    const ordered = accountOrder
      .map((id) => cardMap.get(id))
      .filter((item): item is (typeof accountCards)[number] => Boolean(item));

    const missing = accountCards.filter((item) => !accountOrder.includes(item.id));
    return [...ordered, ...missing];
  }, [accountCards, accountOrder]);

  const orderedAccountIds = useMemo(
    () => orderedAccountCards.map((item) => item.id),
    [orderedAccountCards]
  );

  const filteredAccountCards = useMemo(
    () =>
      orderedAccountCards.filter((item) => {
        if (accountView === "ALL") return true;
        if (accountView === "DEBIT") return item.balance >= 0;
        return item.balance < 0;
      }),
    [orderedAccountCards, accountView]
  );
  const selectedAccountCard = useMemo(
    () => accountCards.find((item) => item.id === selectedAccountCardId) ?? null,
    [accountCards, selectedAccountCardId]
  );
  const selectedAccountTransactions = useMemo(() => {
    if (!selectedAccountCard || !allAccountTransactions) {
      return [];
    }

    return allAccountTransactions.filter((item) =>
      isTransactionLinkedToAccount(item, selectedAccountCard.category)
    );
  }, [allAccountTransactions, selectedAccountCard]);
  const debitNetWorth = useMemo(
    () => accountCards.filter((item) => item.balance >= 0).reduce((sum, item) => sum + item.balance, 0),
    [accountCards]
  );
  const netWorthChangePercent = useMemo(() => {
    if (previousDebitNetWorth === null) {
      return null;
    }

    if (Math.abs(previousDebitNetWorth) < 0.00001) {
      return debitNetWorth === 0 ? 0 : null;
    }

    return ((debitNetWorth - previousDebitNetWorth) / Math.abs(previousDebitNetWorth)) * 100;
  }, [debitNetWorth, previousDebitNetWorth]);
  const warningCount = notifications.filter((n) => n.severity === "warning" && !readNotificationIds.has(n.id)).length;
  const unreadCount = notifications.filter((n) => !readNotificationIds.has(n.id)).length;

  useEffect(() => {
    if (accountCards.length === 0) {
      return;
    }

    setAccountOrder((current) => {
      const availableIds = accountCards.map((item) => item.id);
      const existing = current.filter((id) => availableIds.includes(id));
      const missing = availableIds.filter((id) => !existing.includes(id));
      const next = [...existing, ...missing];

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [accountCards]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACCOUNT_ORDER_STORAGE_KEY, JSON.stringify(accountOrder));
    } catch {
      // ignore storage write failures
    }
  }, [accountOrder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setAccountCardsAnimated(true);
      return;
    }

    setAccountCardsAnimated(false);
    const timer = window.setTimeout(() => setAccountCardsAnimated(true), 24);
    return () => window.clearTimeout(timer);
  }, [accountView, filteredAccountCards.length]);

  async function loadNotifications() {
    try {
      setLoadingNotifications(true);
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed notifications request");
      }
      const json = await response.json();
      setNotifications((json.data ?? []) as NotificationItem[]);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function ensureAccountTransactionsLoaded() {
    if (allAccountTransactions || loadingAccountTransactions) {
      return;
    }

    try {
      setLoadingAccountTransactions(true);
      setAccountTransactionsError(null);

      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }

      const json = (await response.json()) as { data?: AccountTransaction[] };
      setAllAccountTransactions((json.data ?? []) as AccountTransaction[]);
    } catch {
      setAccountTransactionsError("Unable to load account transactions right now.");
      setAllAccountTransactions(null);
    } finally {
      setLoadingAccountTransactions(false);
    }
  }

  function openAccountTransactionsModal(accountId: string) {
    setSelectedAccountCardId(accountId);
    setOpenAccountMenuId(null);
    void ensureAccountTransactionsLoaded();
  }

  async function loadNotificationPreferences() {
    try {
      setLoadingPreferences(true);
      const response = await fetch("/api/notifications/preferences");
      if (!response.ok) {
        throw new Error("Failed to fetch preferences");
      }
      const json = (await response.json()) as { data?: NotificationPreferences };
      if (json.data) {
        setNotificationPreferences(json.data);
      }
    } catch {
      setNotificationPreferences(null);
    } finally {
      setLoadingPreferences(false);
    }
  }

  async function updateNotificationPreference(
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    const previous = notificationPreferences;
    setSavingPreferenceKey(key);
    setNotificationPreferences((current) =>
      current ? { ...current, [key]: value } : current
    );

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preference");
      }

      await loadNotifications();
    } catch {
      setNotificationPreferences(previous);
    } finally {
      setSavingPreferenceKey(null);
    }
  }

  function toggleNotifications() {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) {
      loadNotifications();
      loadNotificationPreferences();
    }
  }

  function markNotificationAsRead(notificationId: string) {
    setReadNotificationIds((previous) => {
      if (previous.has(notificationId)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(notificationId);
      return next;
    });
  }

  function markAllNotificationsAsRead() {
    setReadNotificationIds((previous) => {
      const next = new Set(previous);
      notifications.forEach((item) => next.add(item.id));
      return next;
    });
  }

  function reorderAccountCards(movingId: string, targetId: string) {
    if (movingId === targetId) {
      return;
    }

    setAccountOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : accountCards.map((item) => item.id);
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

  function moveAccountCardByStep(accountId: string, direction: "up" | "down") {
    setAccountOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : accountCards.map((item) => item.id);
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

  function moveAccountCardToEdge(accountId: string, edge: "top" | "bottom") {
    setAccountOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : accountCards.map((item) => item.id);
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

  return (
    <main className="page-shell dock-safe app-surface min-h-screen">
      <div className="reveal relative z-40 overflow-visible border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 sm:text-xs">TrackIt</p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">Dashboard</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
            <a href="/transactions" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center sm:w-auto">
                <RefreshCcw className="h-4 w-4" />
                Transactions
              </Button>
            </a>
            <a href="/budgets" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center sm:w-auto">
                <Target className="h-4 w-4" />
                Budgets
              </Button>
            </a>
            <a href="/plan" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center sm:w-auto">
                <CreditCard className="h-4 w-4" />
                Plan
              </Button>
            </a>
            <a href="/collaboration" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center sm:w-auto">
                <Users className="h-4 w-4" />
                Collaboration
              </Button>
            </a>
            <a href="/profile" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center sm:w-auto">
                <User className="h-4 w-4" />
                Settings
              </Button>
            </a>
            <div className="relative z-50 col-span-2 w-full sm:col-span-1 sm:w-auto" ref={notificationsRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className="relative inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none sm:w-auto"
              >
                <Bell className="h-4 w-4" />
                Notifications
                {warningCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                    {warningCount}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="fixed inset-0 z-40 bg-slate-900/30 sm:hidden"
                />
                <div className="fixed left-3 top-24 z-[90] max-h-[70vh] w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:z-[90] sm:mt-2 sm:max-h-none sm:w-[360px]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Notifications ({unreadCount} unread)
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        disabled={notifications.length === 0 || unreadCount === 0}
                        className="text-xs text-slate-500 transition-colors duration-200 ease-out hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:disabled:text-slate-600"
                      >
                        Mark all read
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          loadNotifications();
                          loadNotificationPreferences();
                        }}
                        className="text-xs text-slate-500 transition-colors duration-200 ease-out hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-950/50">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Alert settings
                    </p>
                    {loadingPreferences ? (
                      <Skeleton variant="rounded" animation="wave" height={72} className="rounded-lg" />
                    ) : notificationPreferences ? (
                      <div className="space-y-1">
                        <PreferenceToggle
                          label="Near budget"
                          checked={notificationPreferences.budgetNearEnabled}
                          disabled={savingPreferenceKey === "budgetNearEnabled"}
                          onChange={(checked) =>
                            updateNotificationPreference("budgetNearEnabled", checked)
                          }
                        />
                        <PreferenceToggle
                          label="Over budget"
                          checked={notificationPreferences.budgetOverEnabled}
                          disabled={savingPreferenceKey === "budgetOverEnabled"}
                          onChange={(checked) =>
                            updateNotificationPreference("budgetOverEnabled", checked)
                          }
                        />
                        <PreferenceToggle
                          label="Monthly spike"
                          checked={notificationPreferences.smartSpikeEnabled}
                          disabled={savingPreferenceKey === "smartSpikeEnabled"}
                          onChange={(checked) =>
                            updateNotificationPreference("smartSpikeEnabled", checked)
                          }
                        />
                        <PreferenceToggle
                          label="Large expense"
                          checked={notificationPreferences.smartLargeExpenseEnabled}
                          disabled={savingPreferenceKey === "smartLargeExpenseEnabled"}
                          onChange={(checked) =>
                            updateNotificationPreference("smartLargeExpenseEnabled", checked)
                          }
                        />
                        <PreferenceToggle
                          label="Category surge"
                          checked={notificationPreferences.smartCategorySurgeEnabled}
                          disabled={savingPreferenceKey === "smartCategorySurgeEnabled"}
                          onChange={(checked) =>
                            updateNotificationPreference("smartCategorySurgeEnabled", checked)
                          }
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Unable to load preferences right now.
                      </p>
                    )}
                  </div>
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {loadingNotifications ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          variant="rounded"
                          animation="wave"
                          height={64}
                          className="rounded-xl"
                        />
                      ))
                    ) : notifications.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const isRead = readNotificationIds.has(item.id);
                        return (
                        <article
                          key={item.id}
                          className={`rounded-xl border px-3 py-2 ${
                            item.severity === "warning"
                              ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20"
                              : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                          } ${isRead ? "opacity-70" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={`text-xs font-semibold ${
                                item.severity === "warning"
                                  ? "text-rose-800 dark:text-rose-300"
                                  : "text-blue-800 dark:text-blue-300"
                              }`}
                            >
                              {item.title}
                            </p>
                            {isRead ? (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Read</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => markNotificationAsRead(item.id)}
                                className="text-[11px] font-medium text-slate-500 transition-colors duration-200 ease-out hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
                            {item.message}
                          </p>
                        </article>
                        );
                      })
                    )}
                  </div>
                  <a
                    href="/transactions"
                    className="mt-2 block rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 motion-reduce:transition-none"
                  >
                    Open transactions dashboard
                  </a>
                </div>
                </>
              ) : null}
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {loading ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={`metric-${index}`}
                  variant="rounded"
                  animation="wave"
                  height={104}
                  className="rounded-3xl"
                />
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] sm:mt-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <Skeleton variant="text" animation="wave" width={180} height={34} />
                <Skeleton variant="text" animation="wave" width={300} height={24} />
                <Skeleton variant="rounded" animation="wave" height={290} className="mt-5 rounded-2xl" />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <Skeleton variant="text" animation="wave" width={120} height={34} />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton
                      key={`quick-stat-${index}`}
                      variant="rounded"
                      animation="wave"
                      height={46}
                      className="rounded-2xl"
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Skeleton variant="text" animation="wave" width={150} height={34} />
                    <Skeleton variant="text" animation="wave" width={330} height={24} />
                  </div>
                  <Skeleton variant="rounded" animation="wave" width={150} height={40} className="rounded-full" />
                </div>
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={`budget-alert-${index}`}
                      variant="rounded"
                      animation="wave"
                      height={74}
                      className="rounded-2xl"
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <Skeleton variant="text" animation="wave" width={140} height={34} />
                <Skeleton variant="text" animation="wave" width={280} height={24} />
                <Skeleton variant="rounded" animation="wave" height={270} className="mt-5 rounded-2xl" />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <Skeleton variant="text" animation="wave" width={100} height={34} />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={`insight-${index}`}
                      variant="rounded"
                      animation="wave"
                      height={48}
                      className="rounded-2xl"
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <Skeleton variant="text" animation="wave" width={170} height={34} />
                <Skeleton variant="text" animation="wave" width={320} height={24} />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={`forecast-${index}`}
                      variant="rounded"
                      animation="wave"
                      height={60}
                      className="rounded-2xl"
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <Skeleton variant="text" animation="wave" width={190} height={34} />
                <Skeleton variant="rounded" animation="wave" height={220} className="mt-4 rounded-2xl" />
              </div>
            </section>
          </>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">{error}</div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Net cashflow" value={formatCurrency(data?.currentBalance ?? 0, preferredCurrency)} icon={Wallet} accent="amber" />
              <MetricCard label="Total income" value={formatCurrency(data?.totalIncome ?? 0, preferredCurrency)} icon={ArrowUpRight} accent="emerald" />
              <MetricCard label="Total expenses" value={formatCurrency(data?.totalExpenses ?? 0, preferredCurrency)} icon={PieChart} accent="rose" />
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Accounts</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your wallets and balances</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Net worth</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{formatCurrency(debitNetWorth, preferredCurrency)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {netWorthChangePercent === null
                      ? "Debit balances only"
                      : `${netWorthChangePercent >= 0 ? "+" : ""}${netWorthChangePercent.toFixed(1)}% vs previous day`}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["ALL", "DEBIT", "CREDIT"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setAccountView(filter)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      accountView === filter
                        ? "border-emerald-500 bg-emerald-100/70 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {filter === "ALL" ? "All" : filter === "DEBIT" ? "Debit" : "Credit"}
                  </button>
                ))}
                <a
                  href="/account-overview"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Account overview
                </a>
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Drag cards to rearrange, or use the menu on each card. Order is saved on this device.
              </p>

              {(data?.walletBreakdown?.uncategorizedAccounts ?? []).length > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800/60 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Fix uncategorized accounts
                  </p>
                  <p className="mt-1 text-sm text-amber-700/90 dark:text-amber-200/90">
                    These categories are currently counted under Other. Rename them to wallet or bank categories for accurate separation.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(data?.walletBreakdown?.uncategorizedAccounts ?? []).map((item) => (
                      <span
                        key={`uncategorized-${item.category}`}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-white/70 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-200"
                      >
                        <span>{item.category}</span>
                        <span>{formatCurrency(item.balance, preferredCurrency)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 justify-center gap-2 sm:[grid-template-columns:repeat(auto-fit,minmax(300px,360px))]">
                {filteredAccountCards.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No account balances for this filter yet.
                  </div>
                ) : (
                  filteredAccountCards.map((account) => {
                    const badge = getWalletBadge(account.category);
                    const cardTheme = getAccountCardTheme(account.category, account.group);
                    const groupLabel =
                      account.group === "cash"
                        ? "Cash"
                        : account.group === "ewallet"
                          ? "E-wallet"
                          : "Bank";
                    const orderIndex = orderedAccountIds.indexOf(account.id);
                    const isFirst = orderIndex <= 0;
                    const isLast = orderIndex === orderedAccountIds.length - 1;
                    const Icon =
                      account.group === "cash"
                        ? Wallet
                        : account.group === "ewallet"
                          ? Smartphone
                          : Landmark;
                    const isCreditCardAccount = isCreditCardLikeAccount(account.category);
                    const pseudoNumber = isCreditCardAccount
                      ? toPseudoCardNumber(`${account.id}:${account.category}`)
                      : null;
                    const pseudoExpiry = isCreditCardAccount
                      ? toPseudoExpiry(`${account.category}:${account.group}`)
                      : null;

                    return (
                      <article
                        key={account.id}
                        draggable
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest("button,a,input,select,textarea")) {
                            return;
                          }

                          if (draggingAccountId) {
                            return;
                          }

                          openAccountTransactionsModal(account.id);
                        }}
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
                            reorderAccountCards(draggingAccountId, account.id);
                          }
                          setDraggingAccountId(null);
                        }}
                        onDragEnd={() => setDraggingAccountId(null)}
                        className={`relative aspect-[1.586/1] w-full max-w-none cursor-pointer overflow-hidden rounded-[28px] border p-4 transition-all duration-300 ease-out sm:cursor-grab sm:p-5 ${cardTheme.cardClass} ${
                          accountCardsAnimated
                            ? "translate-y-0 scale-100 opacity-100"
                            : "translate-y-2 scale-[0.98] opacity-0"
                        } ${draggingAccountId === account.id ? "ring-2 ring-white/40 opacity-80" : ""}`}
                      >
                        <span className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/10" />
                        <span className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-black/10" />
                        <span className="pointer-events-none absolute -right-8 -top-16 h-44 w-44 rounded-full bg-white/10" />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${cardTheme.balanceLabelClass}`}>
                              Current Balance
                            </p>
                            <p className={`mt-1 truncate text-3xl font-semibold tracking-tight ${cardTheme.balanceValueClass}`}>
                              {formatCurrency(account.balance, preferredCurrency)}
                            </p>
                            <p className={`mt-1 truncate text-xs font-medium ${cardTheme.subtitleClass}`}>
                              {account.category}
                            </p>
                          </div>
                          <div className="relative inline-flex flex-col items-end gap-2">
                            <WalletBrandLogo badge={badge} label={account.category} />
                            <div className="inline-flex items-center gap-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${cardTheme.pillClass}`}
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
                            </div>
                            {openAccountMenuId === account.id ? (
                              <div
                                className="absolute right-0 top-9 z-20 min-w-[9.5rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => {
                                    moveAccountCardToEdge(account.id, "top");
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
                                    moveAccountCardByStep(account.id, "up");
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
                                    moveAccountCardByStep(account.id, "down");
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
                                    moveAccountCardToEdge(account.id, "bottom");
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
                        <div className="mt-6 flex items-end justify-between gap-3 pr-11">
                          {isCreditCardAccount ? (
                            <>
                              <p className={`text-lg font-medium tracking-[0.06em] ${cardTheme.titleClass}`}>{pseudoNumber}</p>
                              <div className="text-right">
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${cardTheme.balanceLabelClass}`}>
                                  Valid Thru
                                </p>
                                <p className={`text-lg font-semibold ${cardTheme.titleClass}`}>{pseudoExpiry}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${cardTheme.balanceLabelClass}`}>
                                Non-credit account
                              </p>
                              <p className={`text-sm font-semibold ${cardTheme.titleClass}`}>{groupLabel}</p>
                            </>
                          )}
                        </div>
                        <Icon className={`pointer-events-none absolute bottom-3 right-3 h-8 w-8 sm:h-9 sm:w-9 ${cardTheme.watermarkClass}`} />
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] sm:mt-8">
              <Card className="rounded-3xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40">
                <CardHeader className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Expenses by category</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This month’s breakdown for quick review.</p>
                  </div>
                </CardHeader>
                <CardContent className="mt-2 w-full px-0 sm:px-6">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50 sm:p-4">
                    <div className="h-56 w-full sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                          <XAxis
                            dataKey="category"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            width={56}
                            tickFormatter={(value: number) => formatCompactCurrency(value, preferredCurrency)}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(148, 163, 184, 0.14)", radius: 10 }}
                            content={<ChartTooltip currency={preferredCurrency} />}
                          />
                          <Bar dataKey="amount" radius={[12, 12, 8, 8]}>
                        {chartData.map((entry, index) => (
                          <Cell key={entry.category} fill={palette[index % palette.length]} />
                        ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl p-4 dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quick stats</h2>
                <div className="mt-5 space-y-4">
                  <StatRow
                    label="Top category"
                    value={
                      data?.expensesByCategory[0]?.category ? (
                        <span className="inline-flex items-center gap-2">
                          <span>{data.expensesByCategory[0].category}</span>
                          <WalletCategoryBadge category={data.expensesByCategory[0].category} />
                        </span>
                      ) : (
                        "None yet"
                      )
                    }
                  />
                  <StatRow label="Tracked categories" value={String(data?.expensesByCategory.length ?? 0)} />
                  <StatRow label="Net position" value={formatCurrency((data?.totalIncome ?? 0) - (data?.totalExpenses ?? 0), preferredCurrency)} />
                  <StatRow label="Over budget" value={String(data?.overBudgetCount ?? 0)} />
                  <StatRow label="Near budget limit" value={String(data?.nearBudgetCount ?? 0)} />
                </div>
              </Card>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Budget alerts</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Keep an eye on categories approaching or exceeding limits.
                  </p>
                </div>
                <a
                  href="/budgets"
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none sm:w-auto"
                >
                  Manage budgets
                </a>
              </div>

              <div className="mt-4 space-y-3">
                {(data?.budgetSummary ?? [])
                  .filter((item) => item.usagePercent >= 80)
                  .slice(0, 5)
                  .map((item) => {
                    const isOver = item.usagePercent >= 100;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-3 ${
                          isOver
                            ? "border-rose-200 bg-rose-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-medium ${
                                  isOver ? "text-rose-800" : "text-amber-800"
                                }`}
                              >
                                {item.category}
                              </p>
                              <WalletCategoryBadge category={item.category} />
                            </div>
                            <p
                              className={`text-sm ${
                                isOver ? "text-rose-700" : "text-amber-700"
                              }`}
                            >
                              {formatCurrency(item.spent, preferredCurrency)} /{" "}
                              {formatCurrency(item.limit, preferredCurrency)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              isOver
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isOver ? "Over budget" : "Near limit"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {(data?.budgetSummary ?? []).filter((item) => item.usagePercent >= 80)
                  .length === 0 && (
                   <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                     No budget alerts right now.
                   </div>
                 )}
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      6-month trend
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Income and expenses over recent months.
                    </p>
                  </div>
                </div>
                <div className="mt-6 h-56 w-full sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={64}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickFormatter={(value: number) => formatCompactCurrency(value, preferredCurrency)}
                      />
                      <Legend
                        verticalAlign="top"
                        height={28}
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{value}</span>
                        )}
                      />
                      <Tooltip content={<ChartTooltip currency={preferredCurrency} />} />
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ r: 2.5, strokeWidth: 0, fill: "#22c55e" }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Expense"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ r: 2.5, strokeWidth: 0, fill: "#ef4444" }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Insights</h2>
                <div className="mt-5 space-y-4">
                  <StatRow
                    label="MoM income change"
                    value={formatPercent(data?.monthOverMonth?.incomeChangePercent ?? null)}
                  />
                  <StatRow
                    label="MoM expense change"
                    value={formatPercent(data?.monthOverMonth?.expenseChangePercent ?? null)}
                  />
                  <StatRow
                    label="Best month balance"
                    value={formatCurrency(
                      Math.max(...(trendData.map((item) => item.balance).length
                        ? trendData.map((item) => item.balance)
                        : [0]))
                    , preferredCurrency)}
                  />
                </div>
              </aside>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Cashflow forecast
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Projected next 3 months using recent trend and recurring templates.
                </p>

                <div className="mt-4 space-y-3">
                  {forecastData.map((item) => (
                    <div
                      key={item.month}
                      className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{item.month}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.projectedBalance >= 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          }`}
                        >
                          {formatCurrency(item.projectedBalance, preferredCurrency)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Income {formatCurrency(item.projectedIncome, preferredCurrency)} • Expense {formatCurrency(item.projectedExpense, preferredCurrency)}
                      </p>
                    </div>
                  ))}
                  {forecastData.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No forecast data yet.</p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Category drilldown
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Top categories across recent months.
                </p>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {drilldownData.map((month) => (
                    <div key={month.month} className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{month.label}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {month.values.map((item) => (
                          <span
                            key={`${month.month}-${item.category}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <span>{item.category}</span>
                            <WalletCategoryBadge category={item.category} />
                            <span>{formatCompactCurrency(item.amount, preferredCurrency)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {drilldownData.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No category drilldown data yet.</p>
                  ) : null}
                </div>
              </article>
            </section>
          </>
        )}
      </div>

      {selectedAccountCard ? (
        <AccountOverviewCardTransactionsModal
          account={{
            id: selectedAccountCard.id,
            account: selectedAccountCard.category,
            balance: selectedAccountCard.balance,
            group: selectedAccountCard.group,
          }}
          transactions={selectedAccountTransactions}
          preferredCurrency={preferredCurrency}
          loading={loadingAccountTransactions && allAccountTransactions === null}
          errorMessage={accountTransactionsError}
          onClose={() => setSelectedAccountCardId(null)}
        />
      ) : null}
      <MobileNavDock />
    </main>
  );
}

function computeDebitNetWorth(rows: TransactionLite[]) {
  const balances = new Map<string, number>();

  function applySignedAmount(accountName: string | null | undefined, signedAmount: number) {
    const account = accountName?.trim();
    if (!account || !signedAmount) return;
    balances.set(account, (balances.get(account) ?? 0) + signedAmount);
  }

  for (const row of rows) {
    const amount = row.amount ?? 0;
    if (!amount) continue;

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

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent: "amber" | "emerald" | "rose";
}) {
  const accentStyles = {
    amber: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    rose: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  }[accent];

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${accentStyles}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{value}</p>
    </article>
  );
}

function PreferenceToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-xs text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 disabled:opacity-50"
      />
    </label>
  );
}

function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-slate-700">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function formatCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

function formatCompactCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; dataKey?: string; value?: number; color?: string }>;
  label?: string;
  currency: Currency;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? "#64748b" }} />
              {entry.name ?? entry.dataKey}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(Number(entry.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
