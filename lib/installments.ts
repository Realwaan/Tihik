import type {
  InstallmentPayment,
  InstallmentPlan,
  InstallmentStatus,
  RecurrenceFrequency,
} from "@prisma/client";

type InstallmentStatusInput = {
  paidAmount: number;
  totalAmount: number;
  paidInstallments: number;
  totalInstallments: number;
  currentStatus: InstallmentStatus;
};

export function normalizeDateOnly(dateLike: Date | string) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addInstallmentFrequency(
  value: Date,
  frequency: RecurrenceFrequency,
  interval: number
) {
  const safeInterval = Math.max(1, interval);
  const date = new Date(value);

  if (frequency === "DAILY") {
    date.setDate(date.getDate() + safeInterval);
    return date;
  }

  if (frequency === "WEEKLY") {
    date.setDate(date.getDate() + safeInterval * 7);
    return date;
  }

  date.setMonth(date.getMonth() + safeInterval);
  return date;
}

export function getInstallmentStatus({
  paidAmount,
  totalAmount,
  paidInstallments,
  totalInstallments,
  currentStatus,
}: InstallmentStatusInput): InstallmentStatus {
  const completeByAmount = totalAmount > 0 && paidAmount >= totalAmount;
  const completeByCount = totalInstallments > 0 && paidInstallments >= totalInstallments;

  if (completeByAmount || completeByCount) {
    return "COMPLETED";
  }

  if (currentStatus === "PAUSED") {
    return "PAUSED";
  }

  return "ACTIVE";
}

type InstallmentPaymentSummary = Pick<
  InstallmentPayment,
  | "id"
  | "amount"
  | "currency"
  | "installmentsCovered"
  | "paidAt"
  | "sourceAccount"
  | "note"
  | "linkedTransactionId"
>;

export type InstallmentPlanWithPayments = InstallmentPlan & {
  payments: InstallmentPaymentSummary[];
};

export function withInstallmentProgress<T extends InstallmentPlanWithPayments>(
  plan: T
) {
  const remainingAmount = Math.max(0, plan.totalAmount - plan.paidAmount);
  const overpaidAmount = Math.max(0, plan.paidAmount - plan.totalAmount);

  return {
    ...plan,
    remainingAmount,
    overpaidAmount,
    remainingInstallments: Math.max(0, plan.totalInstallments - plan.paidInstallments),
  };
}
