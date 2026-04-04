import { convertToUSD } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

type NotificationSeverity = "info" | "warning";
type NotificationType =
  | "SMART_SPIKE_MONTH"
  | "SMART_LARGE_EXPENSE"
  | "SMART_CATEGORY_SURGE"
  | "BUDGET_OVER"
  | "BUDGET_NEAR";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: string;
};

const TRANSACTION_TYPE = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

function getLastNMonthRanges(count: number) {
  const now = new Date();
  const ranges: Array<{
    start: Date;
    end: Date;
    key: string;
    label: string;
  }> = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthNumber = `${start.getMonth() + 1}`.padStart(2, "0");
    const key = `${start.getFullYear()}-${monthNumber}`;
    const label = start.toLocaleDateString("en-US", { month: "short" });
    ranges.push({ start, end, key, label });
  }

  return ranges;
}

export async function getNotificationsForUser(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [expenseRows, budgets, monthlyTrend, largeExpense, monthlyTotalsByCurrency] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: TRANSACTION_TYPE.EXPENSE,
          date: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({
        where: { userId, month: monthStart },
      }),
      Promise.all(
        getLastNMonthRanges(6).map(async (range) => {
          const [income, expense] = await Promise.all([
            prisma.transaction.aggregate({
              where: {
                userId,
                type: TRANSACTION_TYPE.INCOME,
                date: { gte: range.start, lt: range.end },
              },
              _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
              where: {
                userId,
                type: TRANSACTION_TYPE.EXPENSE,
                date: { gte: range.start, lt: range.end },
              },
              _sum: { amount: true },
            }),
          ]);
          return {
            month: range.key,
            label: range.label,
            income: income._sum.amount ?? 0,
            expense: expense._sum.amount ?? 0,
          };
        })
      ),
      prisma.transaction.findFirst({
        where: {
          userId,
          type: TRANSACTION_TYPE.EXPENSE,
          date: { gte: monthStart, lt: nextMonthStart },
        },
        orderBy: { amount: "desc" },
        select: { amount: true, category: true, currency: true },
      }),
      prisma.transaction.groupBy({
        by: ["currency"],
        where: {
          userId,
          type: TRANSACTION_TYPE.EXPENSE,
          date: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),
    ]);

  const totalExpensesUsd = monthlyTotalsByCurrency.reduce(
    (sum, row) => sum + convertToUSD(row._sum.amount ?? 0, row.currency),
    0
  );

  const expensesByCategory = expenseRows
    .map((row) => ({ category: row.category, amount: row._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);

  const spendingMap = new Map(
    expenseRows.map((row) => [row.category, row._sum.amount ?? 0])
  );

  const notifications: NotificationItem[] = [];
  const timestamp = new Date().toISOString();

  for (const budget of budgets) {
    const spent = spendingMap.get(budget.category) ?? 0;
    const usagePercent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    if (usagePercent >= 100) {
      notifications.push({
        id: `budget-over-${budget.id}`,
        type: "BUDGET_OVER",
        severity: "warning",
        title: `Over budget: ${budget.category}`,
        message: `You exceeded your ${budget.category} budget this month.`,
        createdAt: timestamp,
      });
    } else if (usagePercent >= 80) {
      notifications.push({
        id: `budget-near-${budget.id}`,
        type: "BUDGET_NEAR",
        severity: "info",
        title: `Near budget limit: ${budget.category}`,
        message: `You're at ${usagePercent.toFixed(1)}% of your ${budget.category} budget.`,
        createdAt: timestamp,
      });
    }
  }

  const currentTrend = monthlyTrend[monthlyTrend.length - 1];
  const previousTrend = monthlyTrend[monthlyTrend.length - 2];

  if (
    previousTrend &&
    previousTrend.expense > 0 &&
    currentTrend.expense > previousTrend.expense * 1.25
  ) {
    const increase =
      ((currentTrend.expense - previousTrend.expense) / previousTrend.expense) * 100;
    notifications.push({
      id: "smart-spike-month",
      type: "SMART_SPIKE_MONTH",
      severity: "warning",
      title: "Monthly spending spike",
      message: `Expenses are up ${increase.toFixed(1)}% vs last month.`,
      createdAt: timestamp,
    });
  }

  const topCategory = expensesByCategory[0];
  const secondCategory = expensesByCategory[1];
  if (topCategory && secondCategory && topCategory.amount > secondCategory.amount * 1.8) {
    notifications.push({
      id: "smart-category-surge",
      type: "SMART_CATEGORY_SURGE",
      severity: "info",
      title: "Category concentration alert",
      message: `${topCategory.category} is dominating spending this month.`,
      createdAt: timestamp,
    });
  }

  if (largeExpense && totalExpensesUsd > 0) {
    const largeExpenseUsd = convertToUSD(largeExpense.amount, largeExpense.currency);
    if (largeExpenseUsd >= totalExpensesUsd * 0.35) {
      notifications.push({
        id: "smart-large-expense",
        type: "SMART_LARGE_EXPENSE",
        severity: "warning",
        title: "Large expense detected",
        message: `${largeExpense.category} is a large share of this month's spending.`,
        createdAt: timestamp,
      });
    }
  }

  return notifications;
}
