import { convertCurrency, formatCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

import type { SupportedCurrency } from "./types";

export async function buildUserFinanceSnapshot(
  userId: string,
  requestPreferredCurrency?: SupportedCurrency
): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const recurringWindowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredCurrency: true },
  });
  const preferredCurrency =
    requestPreferredCurrency ?? user?.preferredCurrency ?? "USD";

  const [
    monthTransactions,
    previousMonthTransactions,
    recentTransactions,
    monthBudgets,
    activeRecurringCount,
    upcomingRecurringCount,
    memberships,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        amount: true,
        currency: true,
        type: true,
        category: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: previousMonthStart,
          lt: monthStart,
        },
      },
      select: {
        amount: true,
        currency: true,
        type: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        date: true,
        amount: true,
        currency: true,
        type: true,
        category: true,
      },
    }),
    prisma.budget.findMany({
      where: {
        userId,
        month: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        category: true,
        limit: true,
      },
    }),
    prisma.recurringTransaction.count({
      where: {
        userId,
        isActive: true,
      },
    }),
    prisma.recurringTransaction.count({
      where: {
        userId,
        isActive: true,
        nextRunDate: {
          gte: now,
          lte: recurringWindowEnd,
        },
      },
    }),
    prisma.householdMember.findMany({
      where: { userId },
      select: { householdId: true },
    }),
  ]);

  let monthIncomePreferred = 0;
  let monthExpensePreferred = 0;
  const categorySpendPreferred = new Map<string, number>();
  const totalsByCurrency = new Map<string, number>();

  for (const item of monthTransactions) {
    const valuePreferred = convertCurrency(
      item.amount,
      item.currency,
      preferredCurrency
    );
    const currencyKey = `${item.currency}:${item.type}`;
    totalsByCurrency.set(currencyKey, (totalsByCurrency.get(currencyKey) ?? 0) + item.amount);

    if (item.type === "INCOME") {
      monthIncomePreferred += valuePreferred;
    } else {
      monthExpensePreferred += valuePreferred;
      categorySpendPreferred.set(
        item.category,
        (categorySpendPreferred.get(item.category) ?? 0) + valuePreferred
      );
    }
  }

  const topCategories = Array.from(categorySpendPreferred.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(
      ([category, amount]) =>
        `${category}: ${formatCurrency(amount, preferredCurrency)}`
    )
    .join(" | ");

  const budgetLimitPreferred = monthBudgets.reduce(
    (sum, item) => sum + item.limit,
    0
  );
  const currentBalancePreferred = monthIncomePreferred - monthExpensePreferred;

  let previousIncomePreferred = 0;
  let previousExpensePreferred = 0;
  for (const item of previousMonthTransactions) {
    const valuePreferred = convertCurrency(
      item.amount,
      item.currency,
      preferredCurrency
    );
    if (item.type === "INCOME") {
      previousIncomePreferred += valuePreferred;
    } else {
      previousExpensePreferred += valuePreferred;
    }
  }

  const incomeChangePercent =
    previousIncomePreferred > 0
      ? ((monthIncomePreferred - previousIncomePreferred) /
          previousIncomePreferred) *
        100
      : null;
  const expenseChangePercent =
    previousExpensePreferred > 0
      ? ((monthExpensePreferred - previousExpensePreferred) /
          previousExpensePreferred) *
        100
      : null;

  let overBudgetCount = 0;
  let nearBudgetCount = 0;
  for (const budget of monthBudgets) {
    const spent = categorySpendPreferred.get(budget.category) ?? 0;
    const usagePercent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    if (usagePercent >= 100) {
      overBudgetCount += 1;
    } else if (usagePercent >= 80) {
      nearBudgetCount += 1;
    }
  }

  const householdIds = Array.from(new Set(memberships.map((item) => item.householdId)));
  let sharedExpensePreferred = 0;

  if (householdIds.length > 0) {
    const sharedExpenses = await prisma.sharedExpense.findMany({
      where: {
        householdId: { in: householdIds },
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        amount: true,
        currency: true,
      },
    });

    sharedExpensePreferred = sharedExpenses.reduce(
      (sum, item) =>
        sum + convertCurrency(item.amount, item.currency, preferredCurrency),
      0
    );
  }

  const recentActivity = recentTransactions
    .slice(0, 3)
    .map((item) => {
      const sign = item.type === "INCOME" ? "+" : "-";
      const date = item.date.toISOString().slice(0, 10);
      const converted = convertCurrency(
        item.amount,
        item.currency,
        preferredCurrency
      );
      return `${date} ${item.category} ${sign}${formatCurrency(converted, preferredCurrency)} (${item.amount} ${item.currency})`;
    })
    .join(" | ");

  const rawCurrencyBreakdown = Array.from(totalsByCurrency.entries())
    .map(([key, amount]) => {
      const [currency, type] = key.split(":");
      const sign = type === "INCOME" ? "+" : "-";
      return `${currency} ${sign}${amount.toFixed(currency === "JPY" ? 0 : 2)}`;
    })
    .join(" | ");

  return [
    "Use this real user finance snapshot when relevant.",
    `Preferred currency: ${preferredCurrency}`,
    `Mixed-currency raw totals: ${rawCurrencyBreakdown || "No multi-currency totals yet"}`,
    "Dashboard signals:",
    `Dashboard current balance: ${formatCurrency(currentBalancePreferred, preferredCurrency)}`,
    `Dashboard month-over-month income change: ${incomeChangePercent === null ? "N/A" : `${incomeChangePercent.toFixed(1)}%`}`,
    `Dashboard month-over-month expense change: ${expenseChangePercent === null ? "N/A" : `${expenseChangePercent.toFixed(1)}%`}`,
    `Dashboard budget alerts: ${overBudgetCount} over budget, ${nearBudgetCount} near budget`,
    `Current month income: ${formatCurrency(monthIncomePreferred, preferredCurrency)}`,
    `Current month expense: ${formatCurrency(monthExpensePreferred, preferredCurrency)}`,
    `Top expense categories this month: ${topCategories || "No expense categories yet"}`,
    `Current month budget total limit: ${formatCurrency(budgetLimitPreferred, preferredCurrency)}`,
    `Active recurring templates: ${activeRecurringCount}`,
    `Recurring runs due in next 30 days: ${upcomingRecurringCount}`,
    `Collaboration households joined: ${householdIds.length}`,
    `Shared household expenses this month: ${formatCurrency(sharedExpensePreferred, preferredCurrency)}`,
    `Recent activity: ${recentActivity || "No recent transactions"}`,
  ].join("\n");
}
