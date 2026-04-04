import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { convertToUSD } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

const TRANSACTION_TYPE = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

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
