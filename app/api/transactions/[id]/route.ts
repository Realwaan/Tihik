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

    const updated = await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: parsed.data,
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
