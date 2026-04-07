import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { convertToUSD } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { getWalletBadge } from "@/lib/wallet-badges";

const TRANSACTION_TYPE = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
  TRANSFER: "TRANSFER",
} as const;

const TRANSFER_CATEGORY = "Transfer";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [incomeAgg, expenseAgg, expenseRows, budgets] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: TRANSACTION_TYPE.INCOME,
          date: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: TRANSACTION_TYPE.EXPENSE,
          category: {
            not: TRANSFER_CATEGORY,
          },
          date: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId: session.user.id,
          type: TRANSACTION_TYPE.EXPENSE,
          category: {
            not: TRANSFER_CATEGORY,
          },
          date: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.budget.findMany({
        where: {
          userId: session.user.id,
          month: monthStart,
        },
      }),
    ]);

    const walletRows = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        amount: true,
        type: true,
        category: true,
        sourceAccount: true,
        destinationAccount: true,
      },
    });

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpenses = expenseAgg._sum.amount ?? 0;
    const currentBalance = totalIncome - totalExpenses;
    const totalsByCurrency = await prisma.transaction.groupBy({
      by: ["currency", "type"],
      where: {
        userId: session.user.id,
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalsByCurrencySummary = totalsByCurrency.map((row) => ({
      currency: row.currency,
      type: row.type,
      amount: row._sum.amount ?? 0,
      amountInUsd: convertToUSD(row._sum.amount ?? 0, row.currency),
    }));

    const expensesByCategory = expenseRows
      .map((row) => ({
        category: row.category,
        amount: row._sum.amount ?? 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const spendingMap = new Map(
      expenseRows.map((row) => [row.category, row._sum.amount ?? 0])
    );

    const budgetSummary = budgets.map((budget) => {
      const spent = spendingMap.get(budget.category) ?? 0;
      const usagePercent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      return {
        id: budget.id,
        category: budget.category,
        limit: budget.limit,
        spent,
        usagePercent,
      };
    });

    const overBudgetCount = budgetSummary.filter(
      (item) => item.usagePercent >= 100
    ).length;
    const nearBudgetCount = budgetSummary.filter(
      (item) => item.usagePercent >= 80 && item.usagePercent < 100
    ).length;

    const walletBreakdownMap = new Map<string, number>();
    const bankBreakdownMap = new Map<string, number>();
    const uncategorizedMap = new Map<string, number>();
    let cashBalance = 0;
    let ewalletBalance = 0;
    let bankBalance = 0;
    let otherBalance = 0;

    const applySignedAmount = (accountName: string | null | undefined, signedAmount: number) => {
      const account = accountName?.trim();
      if (!account || !signedAmount) return;

      const badge = getWalletBadge(account);

      if (badge?.kind === "wallet") {
        ewalletBalance += signedAmount;
        walletBreakdownMap.set(
          account,
          (walletBreakdownMap.get(account) ?? 0) + signedAmount
        );
        return;
      }

      if (badge?.kind === "bank") {
        bankBalance += signedAmount;
        bankBreakdownMap.set(
          account,
          (bankBreakdownMap.get(account) ?? 0) + signedAmount
        );
        return;
      }

      if (account.toLowerCase().includes("cash")) {
        cashBalance += signedAmount;
        return;
      }

      otherBalance += signedAmount;
      uncategorizedMap.set(
        account,
        (uncategorizedMap.get(account) ?? 0) + signedAmount
      );
    };

    for (const row of walletRows) {
      const amount = row.amount ?? 0;
      if (!amount) continue;

      if (row.type === TRANSACTION_TYPE.TRANSFER) {
        applySignedAmount(row.sourceAccount || row.category, -amount);
        applySignedAmount(row.destinationAccount, amount);
        continue;
      }

      const direction = row.type === TRANSACTION_TYPE.INCOME ? 1 : -1;
      applySignedAmount(row.sourceAccount || row.category, amount * direction);
    }

    const ewallets = Array.from(walletBreakdownMap.entries())
      .map(([category, balance]) => ({ category, balance }))
      .sort((a, b) => b.balance - a.balance);

    const banks = Array.from(bankBreakdownMap.entries())
      .map(([category, balance]) => ({ category, balance }))
      .sort((a, b) => b.balance - a.balance);

    const uncategorizedAccounts = Array.from(uncategorizedMap.entries())
      .map(([category, balance]) => ({ category, balance }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 6);

    const trendMonths = getLastNMonthRanges(6);
    const monthlyTrend = await Promise.all(
      trendMonths.map(async (range) => {
        const [income, expense] = await Promise.all([
          prisma.transaction.aggregate({
            where: {
              userId: session.user.id,
              type: TRANSACTION_TYPE.INCOME,
              date: {
                gte: range.start,
                lt: range.end,
              },
            },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: {
              userId: session.user.id,
              type: TRANSACTION_TYPE.EXPENSE,
              category: {
                not: TRANSFER_CATEGORY,
              },
              date: {
                gte: range.start,
                lt: range.end,
              },
            },
            _sum: { amount: true },
          }),
        ]);

        const incomeValue = income._sum.amount ?? 0;
        const expenseValue = expense._sum.amount ?? 0;

        return {
          month: range.key,
          label: range.label,
          income: incomeValue,
          expense: expenseValue,
          balance: incomeValue - expenseValue,
        };
      })
    );

    const currentTrend = monthlyTrend[monthlyTrend.length - 1];
    const previousTrend = monthlyTrend[monthlyTrend.length - 2];
    const expenseChangePercent =
      previousTrend && previousTrend.expense > 0
        ? ((currentTrend.expense - previousTrend.expense) / previousTrend.expense) *
          100
        : null;
    const incomeChangePercent =
      previousTrend && previousTrend.income > 0
        ? ((currentTrend.income - previousTrend.income) / previousTrend.income) * 100
        : null;

    const avgIncome =
      monthlyTrend.reduce((sum, item) => sum + item.income, 0) /
      Math.max(1, monthlyTrend.length);
    const avgExpense =
      monthlyTrend.reduce((sum, item) => sum + item.expense, 0) /
      Math.max(1, monthlyTrend.length);

    const [recurringIncomeTemplates, recurringExpenseTemplates] = await Promise.all([
      prisma.recurringTransaction.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          type: TRANSACTION_TYPE.INCOME,
        },
        select: {
          amount: true,
          frequency: true,
          interval: true,
        },
      }),
      prisma.recurringTransaction.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          type: TRANSACTION_TYPE.EXPENSE,
        },
        select: {
          amount: true,
          frequency: true,
          interval: true,
        },
      }),
    ]);

    const expectedRecurringIncome = recurringIncomeTemplates.reduce(
      (sum, template) =>
        sum +
        estimateMonthlyRecurringAmount(
          template.amount,
          template.frequency,
          template.interval
        ),
      0
    );
    const expectedRecurringExpense = recurringExpenseTemplates.reduce(
      (sum, template) =>
        sum +
        estimateMonthlyRecurringAmount(
          template.amount,
          template.frequency,
          template.interval
        ),
      0
    );

    const forecast = Array.from({ length: 3 }).map((_, index) => {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + index + 1, 1);
      const monthLabel = targetDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      const projectedIncome = Number((avgIncome * 0.55 + expectedRecurringIncome * 0.45).toFixed(2));
      const projectedExpense = Number((avgExpense * 0.55 + expectedRecurringExpense * 0.45).toFixed(2));

      return {
        month: monthLabel,
        projectedIncome,
        projectedExpense,
        projectedBalance: Number((projectedIncome - projectedExpense).toFixed(2)),
      };
    });

    const topCategories = expensesByCategory.slice(0, 5).map((item) => item.category);
    const categoryDrilldown = await Promise.all(
      trendMonths.map(async (range) => {
        const rows = await prisma.transaction.groupBy({
          by: ["category"],
          where: {
            userId: session.user.id,
            type: TRANSACTION_TYPE.EXPENSE,
            date: {
              gte: range.start,
              lt: range.end,
            },
            category: {
              in: topCategories,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const valueMap = new Map(rows.map((row) => [row.category, row._sum.amount ?? 0]));
        return {
          month: range.key,
          label: range.label,
          values: topCategories.map((category) => ({
            category,
            amount: valueMap.get(category) ?? 0,
          })),
        };
      })
    );

    return NextResponse.json(
      {
        data: {
          totalIncome,
          totalExpenses,
          currentBalance,
          expensesByCategory,
          budgetSummary,
          overBudgetCount,
          nearBudgetCount,
          monthlyTrend,
          monthOverMonth: {
            expenseChangePercent,
            incomeChangePercent,
          },
          totalsByCurrency: totalsByCurrencySummary,
          cashflowForecast: forecast,
          categoryDrilldown,
          walletBreakdown: {
            cashBalance,
            ewalletBalance,
            bankBalance,
            otherBalance,
            ewallets,
            banks,
            uncategorizedAccounts,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load dashboard data", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function estimateMonthlyRecurringAmount(
  amount: number,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY",
  interval: number
) {
  if (frequency === "DAILY") {
    const everyNDays = Math.max(1, interval);
    return (30 / everyNDays) * amount;
  }

  if (frequency === "WEEKLY") {
    const everyNWeeks = Math.max(1, interval);
    return (4.345 / everyNWeeks) * amount;
  }

  const everyNMonths = Math.max(1, interval);
  return amount / everyNMonths;
}

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
