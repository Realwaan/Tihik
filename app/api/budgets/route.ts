import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMonthRange, toMonthStart } from "@/lib/budget";
import { ACCOUNT_CATEGORIES } from "@/lib/categories";
import { budgetCreateSchema } from "@/lib/validations/budget";

function parseMonthOrCurrent(value: string | null): Date {
  if (!value) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return toMonthStart(value);
}

function getParentBudgetCategory(category: string): string | null {
  const separators = [":", "/", ">"];

  for (const separator of separators) {
    const index = category.indexOf(separator);
    if (index > 0) {
      const parent = category.slice(0, index).trim();
      if (parent.length > 0 && parent.toLowerCase() !== category.trim().toLowerCase()) {
        return parent;
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const monthStart = parseMonthOrCurrent(month);
    const { start, end } = getMonthRange(monthStart);
    const previousMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() - 1,
      1
    );
    const previousMonthRange = getMonthRange(previousMonthStart);

    const [budgets, previousBudgets, spendingRows, previousSpendingRows] = await Promise.all([
      prisma.budget.findMany({
        where: {
          userId: session.user.id,
          month: monthStart,
        },
        orderBy: {
          category: "asc",
        },
      }),
      prisma.budget.findMany({
        where: {
          userId: session.user.id,
          month: previousMonthStart,
        },
        orderBy: {
          category: "asc",
        },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId: session.user.id,
          type: "EXPENSE",
          category: {
            notIn: [...ACCOUNT_CATEGORIES, "Transfer"],
          },
          date: {
            gte: start,
            lt: end,
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
          type: "EXPENSE",
          category: {
            notIn: [...ACCOUNT_CATEGORIES, "Transfer"],
          },
          date: {
            gte: previousMonthRange.start,
            lt: previousMonthRange.end,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const spendingMap = new Map(
      spendingRows.map((row) => [row.category, row._sum.amount ?? 0])
    );

    const previousSpendingMap = new Map(
      previousSpendingRows.map((row) => [row.category, row._sum.amount ?? 0])
    );

    const previousBudgetMap = new Map(
      previousBudgets.map((budget) => [budget.category, budget])
    );

    const currentCategorySet = new Set(budgets.map((budget) => budget.category));

    const budgetRows = budgets.map((budget) => {
      const spent = spendingMap.get(budget.category) ?? 0;
      const previousBudget = previousBudgetMap.get(budget.category);
      const previousSpent = previousSpendingMap.get(budget.category) ?? 0;
      const rolloverAmount = previousBudget
        ? Math.max(0, previousBudget.limit - previousSpent)
        : 0;
      const effectiveLimit = budget.limit + rolloverAmount;
      const remaining = effectiveLimit - spent;
      const usagePercent = effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 0;
      const parentCategory = getParentBudgetCategory(budget.category);
      const isSubcategory = parentCategory !== null;
      const missingParentBudget =
        isSubcategory && parentCategory ? !currentCategorySet.has(parentCategory) : false;

      return {
        ...budget,
        spent,
        remaining,
        usagePercent,
        rolloverAmount,
        effectiveLimit,
        parentCategory,
        isSubcategory,
        missingParentBudget,
      };
    });

    const subcategoryGroups = new Map<string, typeof budgetRows>();
    for (const row of budgetRows) {
      if (!row.parentCategory) continue;
      const existing = subcategoryGroups.get(row.parentCategory) ?? [];
      existing.push(row);
      subcategoryGroups.set(row.parentCategory, existing);
    }

    const derivedParentRows = Array.from(subcategoryGroups.entries())
      .filter(([parentCategory]) => !currentCategorySet.has(parentCategory))
      .map(([parentCategory, childRows]) => {
        const effectiveLimit = childRows.reduce(
          (sum, row) => sum + row.effectiveLimit,
          0
        );
        const spent = childRows.reduce((sum, row) => sum + row.spent, 0);
        const remaining = effectiveLimit - spent;

        return {
          id: `derived-parent-${parentCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          userId: session.user.id,
          category: parentCategory,
          limit: 0,
          month: monthStart,
          createdAt: monthStart,
          updatedAt: monthStart,
          spent,
          remaining,
          usagePercent: effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 0,
          rolloverAmount: 0,
          effectiveLimit,
          parentCategory: null,
          isSubcategory: false,
          missingParentBudget: false,
          isDerivedParent: true,
          hasSubcategories: true,
        };
      });

    const hasSubcategoriesSet = new Set(subcategoryGroups.keys());

    const data = [...budgetRows, ...derivedParentRows]
      .map((row) => ({
        ...row,
        isDerivedParent: "isDerivedParent" in row ? row.isDerivedParent : false,
        hasSubcategories: hasSubcategoriesSet.has(row.category),
      }))
      .sort((a, b) => {
        const aKey = a.parentCategory
          ? `${a.parentCategory.toLowerCase()}~${a.category.toLowerCase()}`
          : `${a.category.toLowerCase()}~`;
        const bKey = b.parentCategory
          ? `${b.parentCategory.toLowerCase()}~${b.category.toLowerCase()}`
          : `${b.category.toLowerCase()}~`;
        return aKey.localeCompare(bKey);
      });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch budgets", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = budgetCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const monthStart = toMonthStart(parsed.data.month);

    const budget = await prisma.budget.upsert({
      where: {
        userId_category_month: {
          userId: session.user.id,
          category: parsed.data.category,
          month: monthStart,
        },
      },
      create: {
        userId: session.user.id,
        category: parsed.data.category,
        limit: parsed.data.limit,
        month: monthStart,
      },
      update: {
        limit: parsed.data.limit,
      },
    });

    return NextResponse.json({ data: budget }, { status: 201 });
  } catch (error) {
    console.error("Failed to create budget", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
