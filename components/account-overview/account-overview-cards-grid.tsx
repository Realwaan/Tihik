import { Landmark, MoreHorizontal, Smartphone, Wallet } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";

import { WalletLogoDot } from "@/components/ui/wallet-logo-dot";
import { getAccountCardTheme } from "@/lib/account-card-theme";
import { getWalletBadge } from "@/lib/wallet-badges";

import type { AccountCard, Currency } from "./account-overview-types";
import { formatCurrency } from "./account-overview-utils";

type AccountOverviewCardsGridProps = {
  loading: boolean;
  orderedAccounts: AccountCard[];
  orderedAccountIds: string[];
  preferredCurrency: Currency;
  draggingAccountId: string | null;
  openAccountMenuId: string | null;
  onSetDraggingAccountId: (id: string | null) => void;
  onSetOpenAccountMenuId: (id: string | null) => void;
  onReorderAccounts: (movingId: string, targetId: string) => void;
  onMoveAccountByStep: (accountId: string, direction: "up" | "down") => void;
  onMoveAccountToEdge: (accountId: string, edge: "top" | "bottom") => void;
};

export function AccountOverviewCardsGrid({
  loading,
  orderedAccounts,
  orderedAccountIds,
  preferredCurrency,
  draggingAccountId,
  openAccountMenuId,
  onSetDraggingAccountId,
  onSetOpenAccountMenuId,
  onReorderAccounts,
  onMoveAccountByStep,
  onMoveAccountToEdge,
}: AccountOverviewCardsGridProps) {
  return (
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
                onSetDraggingAccountId(account.id);
                onSetOpenAccountMenuId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingAccountId) {
                  onReorderAccounts(draggingAccountId, account.id);
                }
                onSetDraggingAccountId(null);
              }}
              onDragEnd={() => onSetDraggingAccountId(null)}
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
                      onSetOpenAccountMenuId(openAccountMenuId === account.id ? null : account.id);
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
                          onMoveAccountToEdge(account.id, "top");
                          onSetOpenAccountMenuId(null);
                        }}
                        className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Move to top
                      </button>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => {
                          onMoveAccountByStep(account.id, "up");
                          onSetOpenAccountMenuId(null);
                        }}
                        className="mt-1 block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => {
                          onMoveAccountByStep(account.id, "down");
                          onSetOpenAccountMenuId(null);
                        }}
                        className="mt-1 block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => {
                          onMoveAccountToEdge(account.id, "bottom");
                          onSetOpenAccountMenuId(null);
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
  );
}
