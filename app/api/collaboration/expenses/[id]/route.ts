import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { userHasHouseholdAccess } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { sharedExpenseUpdateSchema } from "@/lib/validations/collaboration";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.sharedExpense.findUnique({
      where: { id },
      select: { id: true, householdId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const access = await userHasHouseholdAccess(
      session.user.id,
      existing.householdId
    );
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = sharedExpenseUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 }
      );
    }

    const updated = await prisma.sharedExpense.update({
      where: { id },
      data: parsed.data,
      include: {
        paidByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update shared expense", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.sharedExpense.findUnique({
      where: { id },
      select: { id: true, householdId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const access = await userHasHouseholdAccess(
      session.user.id,
      existing.householdId
    );
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.sharedExpense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete shared expense", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
