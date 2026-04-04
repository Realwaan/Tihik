import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { PREMADE_CATEGORIES, PREMADE_EXPENSE_CATEGORIES, PREMADE_INCOME_CATEGORIES } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [transactions, recurring, budgets, sharedExpenses] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        select: { category: true, type: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId: session.user.id },
        select: { category: true, type: true },
      }),
      prisma.budget.findMany({
        where: { userId: session.user.id },
        select: { category: true },
      }),
      prisma.sharedExpense.findMany({
        where: { paidByUserId: session.user.id },
        select: { category: true },
      }),
    ]);

    const expenseDynamic = [
      ...transactions.filter((item) => item.type === "EXPENSE").map((item) => item.category),
      ...recurring.filter((item) => item.type === "EXPENSE").map((item) => item.category),
      ...budgets.map((item) => item.category),
      ...sharedExpenses.map((item) => item.category),
    ];
    const incomeDynamic = [
      ...transactions.filter((item) => item.type === "INCOME").map((item) => item.category),
      ...recurring.filter((item) => item.type === "INCOME").map((item) => item.category),
    ];

    const toSortedUnique = (items: string[]) =>
      Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      );

    const expenseCategories = toSortedUnique([
      ...PREMADE_EXPENSE_CATEGORIES,
      ...expenseDynamic,
    ]);
    const incomeCategories = toSortedUnique([
      ...PREMADE_INCOME_CATEGORIES,
      ...incomeDynamic,
    ]);
    const allCategories = toSortedUnique([
      ...PREMADE_CATEGORIES,
      ...expenseDynamic,
      ...incomeDynamic,
    ]);

    return NextResponse.json(
      {
        data: {
          all: allCategories,
          expense: expenseCategories,
          income: incomeCategories,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch categories", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
