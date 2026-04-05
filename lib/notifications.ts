import { convertToUSD } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

type NotificationSeverity = "info" | "warning";
type NotificationType =
  | "SMART_SPIKE_MONTH"
  | "SMART_LARGE_EXPENSE"
  | "SMART_CATEGORY_SURGE"
  | "BUDGET_OVER"
  | "BUDGET_NEAR"
  | "COLLAB_SETTLEMENT_REMINDER"
  | "COLLAB_SETTLEMENT_OVERDUE"
  | "RECURRING_MISSED_PAYMENT";

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

  const [
    expenseRows,
    budgets,
    monthlyTrend,
    largeExpense,
    monthlyTotalsByCurrency,
    preferences,
    settlementReminders,
    missedRecurring,
  ] =
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
      prisma.notificationPreference.findUnique({ where: { userId } }),
      prisma.$queryRaw<
        Array<{
          id: string;
          householdName: string;
          toName: string;
          amountUsd: number;
          dueDate: Date;
          lastReminderAt: Date | null;
          reminderCount: number;
        }>
      >`
        SELECT
          p.id,
          h.name AS "householdName",
          COALESCE(to_user.name, to_user.email, 'Member') AS "toName",
          p.amount_usd AS "amountUsd",
          p.due_date AS "dueDate",
          p.last_reminder_at AS "lastReminderAt",
          p.reminder_count AS "reminderCount"
        FROM collaboration_settlement_payment p
        INNER JOIN "Household" h ON h.id = p.household_id
        INNER JOIN "User" to_user ON to_user.id = p.to_user_id
        WHERE p.from_user_id = ${userId}
          AND p.status = 'PENDING'
      `.catch(() => []),
      prisma.recurringTransaction.findMany({
        where: {
          userId,
          isActive: true,
          nextRunDate: {
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
        select: {
          id: true,
          category: true,
          amount: true,
          currency: true,
          nextRunDate: true,
        },
        orderBy: { nextRunDate: "asc" },
        take: 5,
      }),
    ]);

  const effectivePreferences = {
    budgetNearEnabled: preferences?.budgetNearEnabled ?? true,
    budgetOverEnabled: preferences?.budgetOverEnabled ?? true,
    smartSpikeEnabled: preferences?.smartSpikeEnabled ?? true,
    smartLargeExpenseEnabled: preferences?.smartLargeExpenseEnabled ?? true,
    smartCategorySurgeEnabled: preferences?.smartCategorySurgeEnabled ?? true,
  };

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
    if (usagePercent >= 100 && effectivePreferences.budgetOverEnabled) {
      notifications.push({
        id: `budget-over-${budget.id}`,
        type: "BUDGET_OVER",
        severity: "warning",
        title: `Over budget: ${budget.category}`,
        message: `You exceeded your ${budget.category} budget this month.`,
        createdAt: timestamp,
      });
    } else if (usagePercent >= 80 && effectivePreferences.budgetNearEnabled) {
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
    effectivePreferences.smartSpikeEnabled &&
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
  if (
    effectivePreferences.smartCategorySurgeEnabled &&
    topCategory &&
    secondCategory &&
    topCategory.amount > secondCategory.amount * 1.8
  ) {
    notifications.push({
      id: "smart-category-surge",
      type: "SMART_CATEGORY_SURGE",
      severity: "info",
      title: "Category concentration alert",
      message: `${topCategory.category} is dominating spending this month.`,
      createdAt: timestamp,
    });
  }

  if (effectivePreferences.smartLargeExpenseEnabled && largeExpense && totalExpensesUsd > 0) {
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

  const reminderCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  for (const payment of settlementReminders) {
    const dueDate = new Date(payment.dueDate);
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysUntilDue < 0) {
      notifications.push({
        id: `settlement-overdue-${payment.id}`,
        type: "COLLAB_SETTLEMENT_OVERDUE",
        severity: "warning",
        title: `Settlement overdue in ${payment.householdName}`,
        message: `You still owe ${payment.toName} $${payment.amountUsd.toFixed(2)}.`,
        createdAt: timestamp,
      });
      continue;
    }

    if (daysUntilDue <= 3) {
      const reminderSentRecently =
        payment.lastReminderAt && new Date(payment.lastReminderAt) > reminderCutoff;
      notifications.push({
        id: `settlement-reminder-${payment.id}`,
        type: "COLLAB_SETTLEMENT_REMINDER",
        severity: reminderSentRecently ? "warning" : "info",
        title: `Settlement due soon in ${payment.householdName}`,
        message: `Pay ${payment.toName} $${payment.amountUsd.toFixed(2)} within ${Math.max(
          0,
          daysUntilDue
        )} day(s).`,
        createdAt: timestamp,
      });
    }
  }

  for (const recurring of missedRecurring) {
    const daysLate = Math.max(
      1,
      Math.floor(
        (now.getTime() - new Date(recurring.nextRunDate).getTime()) /
          (24 * 60 * 60 * 1000)
      )
    );

    notifications.push({
      id: `recurring-missed-${recurring.id}`,
      type: "RECURRING_MISSED_PAYMENT",
      severity: "warning",
      title: `Missed recurring entry: ${recurring.category}`,
      message: `Scheduled ${daysLate} day(s) ago for ${recurring.currency} ${recurring.amount.toFixed(2)}.`,
      createdAt: timestamp,
    });
  }

  return notifications;
}
