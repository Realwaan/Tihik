import type { Currency, Transaction } from "./account-overview-types";

export const ACCOUNT_OVERVIEW_ORDER_STORAGE_KEY = "trackit.account-overview.order.v1";

export function computeDebitNetWorth(rows: Transaction[], endDateExclusive?: Date) {
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

export function formatCurrency(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}
