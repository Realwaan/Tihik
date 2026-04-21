import { AlertTriangle, Loader2 } from "lucide-react";

import type { AccountCard, Currency } from "./account-overview-types";
import { formatCurrency } from "./account-overview-utils";

type AccountOverviewToolbarProps = {
  debitNetWorth: number;
  preferredCurrency: Currency;
  netWorthChangePercent: number | null;
  orderedAccounts: AccountCard[];
  selectedAccount: string;
  onSelectAccount: (account: string) => void;
  forceDeleting: boolean;
  onForceDeleteAccount: () => void;
};

export function AccountOverviewToolbar({
  debitNetWorth,
  preferredCurrency,
  netWorthChangePercent,
  orderedAccounts,
  selectedAccount,
  onSelectAccount,
  forceDeleting,
  onForceDeleteAccount,
}: AccountOverviewToolbarProps) {
  return (
    <>
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
          onClick={() => onSelectAccount("ALL")}
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
            onClick={() => onSelectAccount(account.account)}
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
              onClick={onForceDeleteAccount}
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
    </>
  );
}
