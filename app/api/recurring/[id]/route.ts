import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recurringUpdateSchema } from "@/lib/validations/recurring";

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
    const existing = await prisma.recurringTransaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring template not found" },
        { status: 404 }
      );
    }

    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = recurringUpdateSchema.safeParse(json);

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

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(parsed.data.amount ? { amount: parsed.data.amount } : {}),
        ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
        ...(parsed.data.category ? { category: parsed.data.category } : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
        ...(parsed.data.frequency ? { frequency: parsed.data.frequency } : {}),
        ...(parsed.data.interval ? { interval: parsed.data.interval } : {}),
        ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}),
        ...(parsed.data.endDate !== undefined
          ? { endDate: parsed.data.endDate }
          : {}),
        ...(parsed.data.isActive !== undefined
          ? { isActive: parsed.data.isActive }
          : {}),
      },
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update recurring transaction", error);
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
    const existing = await prisma.recurringTransaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring template not found" },
        { status: 404 }
      );
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete recurring transaction", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
