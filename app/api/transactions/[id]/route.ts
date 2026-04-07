import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { transactionUpdateSchema } from "@/lib/validations/transaction";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: transactionId } = await context.params;

    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = transactionUpdateSchema.safeParse(json);

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

    const normalizedData: {
      amount?: number;
      currency?: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
      type?: "INCOME" | "EXPENSE" | "TRANSFER";
      category?: string;
      sourceAccount?: string | null;
      destinationAccount?: string | null;
      note?: string | null;
      date?: Date;
    } = {};

    if (parsed.data.amount !== undefined) {
      normalizedData.amount = parsed.data.amount;
    }

    if (parsed.data.currency !== undefined) {
      normalizedData.currency = parsed.data.currency;
    }

    if (parsed.data.note !== undefined) {
      normalizedData.note = parsed.data.note;
    }

    if (parsed.data.date !== undefined) {
      normalizedData.date = parsed.data.date;
    }

    if (parsed.data.sourceAccount !== undefined) {
      normalizedData.sourceAccount = parsed.data.sourceAccount?.trim() || null;
    }

    if (parsed.data.type !== undefined) {
      normalizedData.type = parsed.data.type;
      if (parsed.data.type === "TRANSFER") {
        normalizedData.category = "Transfer";
        normalizedData.destinationAccount =
          parsed.data.destinationAccount?.trim() || null;
      } else {
        normalizedData.destinationAccount = null;
      }
    }

    if (parsed.data.category !== undefined && parsed.data.type !== "TRANSFER") {
      normalizedData.category = parsed.data.category?.trim() || "";
    }

    if (
      parsed.data.destinationAccount !== undefined &&
      parsed.data.type === "TRANSFER"
    ) {
      normalizedData.destinationAccount =
        parsed.data.destinationAccount?.trim() || null;
    }

    const updated = await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: normalizedData,
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update transaction", error);
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

    const { id: transactionId } = await context.params;

    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete transaction", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
