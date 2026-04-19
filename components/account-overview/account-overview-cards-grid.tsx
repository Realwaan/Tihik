import { Landmark, MoreHorizontal, ReceiptText, Smartphone, Wallet } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";

import { WalletBrandLogo } from "@/components/ui/wallet-brand-logo";
import { getAccountCardTheme } from "@/lib/account-card-theme";
import { isCreditCardLikeAccount } from "@/lib/bank-account-eligibility";
import { getWalletBadge } from "@/lib/wallet-badges";

import type { AccountCard, Currency } from "./account-overview-types";
import { formatCurrency } from "./account-overview-utils";

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
  onOpenTransactionsModal: (accountId: string) => void;
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
  onOpenTransactionsModal,
}: AccountOverviewCardsGridProps) {
  return (
    <div className="mt-6 grid grid-cols-1 justify-center gap-2 sm:[grid-template-columns:repeat(auto-fit,minmax(300px,360px))]">
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            animation="wave"
            height={164}
            className="rounded-2xl"
          />
        ))
      ) : orderedAccounts.length === 0 ? (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
          const isCreditCardAccount = isCreditCardLikeAccount(account.account);
          const pseudoNumber = isCreditCardAccount
            ? toPseudoCardNumber(`${account.id}:${account.account}`)
            : null;
          const pseudoExpiry = isCreditCardAccount
            ? toPseudoExpiry(`${account.account}:${resolvedGroup}`)
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

                onOpenTransactionsModal(account.id);
              }}
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
              className={`relative aspect-[1.586/1] w-full max-w-none cursor-pointer overflow-hidden rounded-[28px] border p-4 sm:cursor-grab sm:p-5 ${cardTheme.cardClass} ${draggingAccountId === account.id ? "ring-2 ring-white/40 opacity-80" : ""}`}
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
                    {account.account}
                  </p>
                </div>
                <div className="relative inline-flex flex-col items-end gap-2">
                  <WalletBrandLogo badge={badge} label={account.account} />
                  <div className="inline-flex items-center gap-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${cardTheme.pillClass}`}
                    >
                      {groupLabel}
                    </span>
                    <button
                      type="button"
                      aria-label={`View transactions for ${account.account}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onOpenTransactionsModal(account.id);
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${cardTheme.pillClass}`}
                    >
                      <ReceiptText className="h-3.5 w-3.5" />
                    </button>
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
  );
}
