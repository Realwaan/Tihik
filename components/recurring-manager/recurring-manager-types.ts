export type RecurringTemplate = {
  id: string;
  amount: number;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: "INCOME" | "EXPENSE";
  category: string;
  sourceAccount?: string | null;
  note?: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  startDate: string;
  nextRunDate: string;
  endDate?: string | null;
  isActive: boolean;
};

export type FormState = {
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: "INCOME" | "EXPENSE";
  category: string;
  sourceAccount: string;
  note: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: string;
  startDate: string;
  endDate: string;
};
