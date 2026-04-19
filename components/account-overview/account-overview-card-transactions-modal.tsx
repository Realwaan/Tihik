import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Landmark, Smartphone, Wallet, X } from "lucide-react";

import { WalletBrandLogo } from "@/components/ui/wallet-brand-logo";
import { getAccountCardTheme } from "@/lib/account-card-theme";
import { getWalletBadge } from "@/lib/wallet-badges";

import type { AccountCard, Currency, Transaction } from "./account-overview-types";
import { formatCurrency } from "./account-overview-utils";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MIDNIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/;
const TRANSACTIONS_PER_PAGE = 5;

function formatTransactionTimestamp(transaction: Transaction) {
  const rawDate = transaction.date?.trim() ?? "";
  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate || "Unknown date";
  }

  const hasDateOnlyArtifact =
    DATE_ONLY_PATTERN.test(rawDate) || UTC_MIDNIGHT_PATTERN.test(rawDate);

  if (hasDateOnlyArtifact && transaction.createdAt) {
    const createdAtDate = new Date(transaction.createdAt);
    if (!Number.isNaN(createdAtDate.getTime())) {
      return createdAtDate.toLocaleString();
    }
  }

  return parsedDate.toLocaleString();
}

type AccountOverviewCardTransactionsModalProps = {
  account: AccountCard;
  transactions: Transaction[];
  preferredCurrency: Currency;
  loading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
};

function resolveAccountGroup(account: AccountCard): "cash" | "ewallet" | "bank" {
  const badge = getWalletBadge(account.account);

  if (account.group === "cash") return "cash";
  if (account.group === "ewallet") return "ewallet";
  if (account.group === "bank") return "bank";

  return badge?.kind === "wallet" ? "ewallet" : "bank";
}

export function AccountOverviewCardTransactionsModal({
  account,
  transactions,
  preferredCurrency,
  loading = false,
  errorMessage = null,
  onClose,
}: AccountOverviewCardTransactionsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resolvedGroup = resolveAccountGroup(account);
  const groupLabel =
    resolvedGroup === "cash" ? "Cash" : resolvedGroup === "ewallet" ? "E-wallet" : "Bank";
  const badge = getWalletBadge(account.account);
  const cardTheme = getAccountCardTheme(account.account, resolvedGroup);
  const GroupIcon =
    resolvedGroup === "cash"
      ? Wallet
      : resolvedGroup === "ewallet"
        ? Smartphone
        : Landmark;

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [transactions]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedTransactions.length / TRANSACTIONS_PER_PAGE)),
    [sortedTransactions.length]
  );

  const pagedTransactions = useMemo(() => {
    const start = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    return sortedTransactions.slice(start, start + TRANSACTIONS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  const pageStartIndex =
    sortedTransactions.length === 0
      ? 0
      : (currentPage - 1) * TRANSACTIONS_PER_PAGE + 1;
  const pageEndIndex =
    sortedTransactions.length === 0
      ? 0
      : Math.min(currentPage * TRANSACTIONS_PER_PAGE, sortedTransactions.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [account.id]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close account transactions modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-card-transactions-title"
        className="relative z-10 max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[88vh] sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Account transactions
            </p>
            <h3
              id="account-card-transactions-title"
              className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {account.account}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className={`mt-4 relative overflow-hidden rounded-2xl border p-4 ${cardTheme.cardClass}`}>
          <span className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-black/10" />
          <span className="pointer-events-none absolute -right-8 -top-16 h-44 w-44 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${cardTheme.balanceLabelClass}`}>
                Current Balance
              </p>
              <p className={`mt-1 truncate text-2xl font-semibold tracking-tight ${cardTheme.balanceValueClass}`}>
                {formatCurrency(account.balance, preferredCurrency)}
              </p>
              <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${cardTheme.subtitleClass}`}>
                <GroupIcon className="h-3.5 w-3.5" />
                <span>{groupLabel}</span>
              </p>
            </div>

            <WalletBrandLogo badge={badge} label={account.account} />
          </div>
        </section>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">All linked transactions</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {sortedTransactions.length} record{sortedTransactions.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="mt-3 rounded-2xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Loading transactions...
          </div>
        ) : errorMessage ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
            {errorMessage}
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No transactions linked to this account yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {pagedTransactions.map((transaction) => (
              <article
                key={transaction.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {transaction.category}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatTransactionTimestamp(transaction)}
                    </p>
                    {transaction.note ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {transaction.note}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {(transaction.sourceAccount || "No source") +
                        (transaction.destinationAccount
                          ? ` -> ${transaction.destinationAccount}`
                          : "")}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      transaction.type === "INCOME"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : transaction.type === "EXPENSE"
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {transaction.type === "INCOME"
                      ? "+"
                      : transaction.type === "EXPENSE"
                        ? "-"
                        : "↔ "}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                </div>
              </article>
            ))}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 sm:text-left">
                Showing {pageStartIndex}-{pageEndIndex} of {sortedTransactions.length} records.
              </p>
              {totalPages > 1 ? (
                <div className="inline-flex items-center justify-center gap-2 self-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                    disabled={currentPage === 1}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((previous) => Math.min(totalPages, previous + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
