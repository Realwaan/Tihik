import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMonthRange, toMonthStart } from "@/lib/budget";
import { budgetCreateSchema } from "@/lib/validations/budget";

function parseMonthOrCurrent(value: string | null): Date {
  if (!value) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return toMonthStart(value);
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

    const [budgets, spendingRows] = await Promise.all([
      prisma.budget.findMany({
        where: {
          userId: session.user.id,
          month: monthStart,
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
          date: {
            gte: start,
            lt: end,
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

    const data = budgets.map((budget) => {
      const spent = spendingMap.get(budget.category) ?? 0;
      const remaining = budget.limit - spent;
      const usagePercent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

      return {
        ...budget,
        spent,
        remaining,
        usagePercent,
      };
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
