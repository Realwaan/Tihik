import { Copy, Loader2, Trash2, WalletCards } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";

import type { Transaction } from "./account-overview-types";
import { formatCurrency } from "./account-overview-utils";

type AccountOverviewHistoryProps = {
  loading: boolean;
  filteredTransactions: Transaction[];
  deletingId: string | null;
  duplicatingId: string | null;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export function AccountOverviewHistory({
  loading,
  filteredTransactions,
  deletingId,
  duplicatingId,
  onDelete,
  onDuplicate,
}: AccountOverviewHistoryProps) {
  return (
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
                  onClick={() => onDuplicate(transaction.id)}
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
                  onClick={() => onDelete(transaction.id)}
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
  );
}
