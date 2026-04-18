export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export type Transaction = {
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

export type DashboardData = {
  walletBreakdown: {
    cashBalance: number;
    ewallets: Array<{ category: string; balance: number }>;
    banks: Array<{ category: string; balance: number }>;
    uncategorizedAccounts: Array<{ category: string; balance: number }>;
  };
};

export type AccountCard = {
  id: string;
  account: string;
  balance: number;
  group: "cash" | "ewallet" | "bank" | "other";
};
