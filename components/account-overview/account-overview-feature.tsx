"use client";

import { useMemo, useState } from "react";

import { AccountOverviewCardTransactionsModal } from "./account-overview-card-transactions-modal";
import { AccountOverviewCardsGrid } from "./account-overview-cards-grid";
import { AccountOverviewHistory } from "./account-overview-history";
import { AccountOverviewToolbar } from "./account-overview-toolbar";
import { isTransactionLinkedToAccount } from "./account-overview-utils";
import { useAccountOverview } from "./use-account-overview";

export function AccountOverview() {
  const {
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
  } = useAccountOverview();
  const [openTransactionsAccountId, setOpenTransactionsAccountId] = useState<string | null>(null);

  const activeModalAccount = useMemo(
    () =>
      orderedAccounts.find((item) => item.id === openTransactionsAccountId) ?? null,
    [orderedAccounts, openTransactionsAccountId]
  );

  const modalTransactions = useMemo(() => {
    if (!activeModalAccount) {
      return [];
    }

    return transactions.filter((item) =>
      isTransactionLinkedToAccount(item, activeModalAccount.account)
    );
  }, [transactions, activeModalAccount]);

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
        <AccountOverviewToolbar
          debitNetWorth={debitNetWorth}
          preferredCurrency={preferredCurrency}
          netWorthChangePercent={netWorthChangePercent}
          orderedAccounts={orderedAccounts}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
          forceDeleting={forceDeleting}
          onForceDeleteAccount={handleForceDeleteAccount}
        />

        <AccountOverviewCardsGrid
          loading={loading}
          orderedAccounts={orderedAccounts}
          orderedAccountIds={orderedAccountIds}
          preferredCurrency={preferredCurrency}
          draggingAccountId={draggingAccountId}
          openAccountMenuId={openAccountMenuId}
          onSetDraggingAccountId={setDraggingAccountId}
          onSetOpenAccountMenuId={setOpenAccountMenuId}
          onReorderAccounts={reorderAccounts}
          onMoveAccountByStep={moveAccountByStep}
          onMoveAccountToEdge={moveAccountToEdge}
          onOpenTransactionsModal={setOpenTransactionsAccountId}
        />

        <AccountOverviewHistory
          loading={loading}
          filteredTransactions={filteredTransactions}
          deletingId={deletingId}
          duplicatingId={duplicatingId}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </section>

      {activeModalAccount ? (
        <AccountOverviewCardTransactionsModal
          account={activeModalAccount}
          transactions={modalTransactions}
          preferredCurrency={preferredCurrency}
          onClose={() => setOpenTransactionsAccountId(null)}
        />
      ) : null}
    </>
  );
}
