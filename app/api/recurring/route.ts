import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runRecurringGenerationForUser } from "@/lib/recurring";
import { recurringCreateSchema } from "@/lib/validations/recurring";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runRecurringGenerationForUser(session.user.id);

    const data = await prisma.recurringTransaction.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch recurring transactions", error);
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

    const parsed = recurringCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const startDate = new Date(parsed.data.startDate);
    const nextRunDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: session.user.id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        type: parsed.data.type,
        category: parsed.data.category,
        note: parsed.data.note,
        frequency: parsed.data.frequency,
        interval: parsed.data.interval,
        startDate: nextRunDate,
        nextRunDate,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        isActive: parsed.data.isActive ?? true,
      },
    });

    await runRecurringGenerationForUser(session.user.id);

    return NextResponse.json({ data: recurring }, { status: 201 });
  } catch (error) {
    console.error("Failed to create recurring transaction", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
