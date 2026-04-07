import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
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
        amount: true,
        currency: true,
        type: true,
        category: true,
        sourceAccount: true,
        destinationAccount: true,
        note: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const duplicated = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: existing.amount,
        currency: existing.currency,
        type: existing.type,
        category: existing.category,
        sourceAccount: existing.sourceAccount,
        destinationAccount: existing.destinationAccount,
        note: existing.note,
        date: new Date(),
      },
    });

    return NextResponse.json({ data: duplicated }, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate transaction", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
