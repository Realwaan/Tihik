import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runRecurringGenerationForUser } from "@/lib/recurring";
import { transactionCreateSchema } from "@/lib/validations/transaction";

function toDateOrNull(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runRecurringGenerationForUser(session.user.id);

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const startDate = toDateOrNull(startDateParam);
    const endDate = toDateOrNull(endDateParam);

    if (startDateParam && !startDate) {
      return NextResponse.json(
        { error: "Invalid startDate query parameter" },
        { status: 400 }
      );
    }

    if (endDateParam && !endDate) {
      return NextResponse.json(
        { error: "Invalid endDate query parameter" },
        { status: 400 }
      );
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      dateFilter.gte = startDate;
    }

    if (endDate) {
      dateFilter.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        ...(startDate || endDate ? { date: dateFilter } : {}),
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ data: transactions }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch transactions", error);
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

    const parsed = transactionCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
