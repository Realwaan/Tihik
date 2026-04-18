"use client";

import { AccountOverviewCardsGrid } from "./account-overview-cards-grid";
import { AccountOverviewHistory } from "./account-overview-history";
import { AccountOverviewToolbar } from "./account-overview-toolbar";
import { useAccountOverview } from "./use-account-overview";

export function AccountOverview() {
  const {
    loading,
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

  return (
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
  );
}
