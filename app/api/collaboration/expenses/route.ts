import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { isUserEmailVerified, userHasHouseholdAccess } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { sharedExpenseCreateSchema } from "@/lib/validations/collaboration";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verified = await isUserEmailVerified(session.user.id);
    if (!verified) {
      return NextResponse.json(
        { error: "Please verify your email before adding shared expenses." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const access = await userHasHouseholdAccess(session.user.id, householdId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expenses = await prisma.sharedExpense.findMany({
      where: { householdId },
      include: {
        paidByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ data: expenses }, { status: 200 });
  } catch (error) {
    console.error("Failed to load shared expenses", error);
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

    const parsed = sharedExpenseCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const access = await userHasHouseholdAccess(
      session.user.id,
      parsed.data.householdId
    );
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expense = await prisma.sharedExpense.create({
      data: {
        householdId: parsed.data.householdId,
        paidByUserId: session.user.id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        category: parsed.data.category,
        description: parsed.data.description,
        date: parsed.data.date,
      },
      include: {
        paidByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create shared expense", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
