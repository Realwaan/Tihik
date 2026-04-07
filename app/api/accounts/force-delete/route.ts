import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const account = (json?.account as string | undefined)?.trim();

    if (!account) {
      return NextResponse.json({ error: "Account is required" }, { status: 400 });
    }

    const [
      transactionsDeleted,
      recurringDeleted,
      budgetsDeleted,
      installmentPaymentsDeleted,
      installmentPlansDeleted,
    ] = await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: {
          userId: session.user.id,
          OR: [
            { sourceAccount: { equals: account, mode: "insensitive" } },
            { destinationAccount: { equals: account, mode: "insensitive" } },
            { category: { equals: account, mode: "insensitive" } },
          ],
        },
      }),
      prisma.recurringTransaction.deleteMany({
        where: {
          userId: session.user.id,
          OR: [
            { category: { equals: account, mode: "insensitive" } },
            { note: { contains: `"account":"${account}"`, mode: "insensitive" } },
          ],
        },
      }),
      prisma.budget.deleteMany({
        where: {
          userId: session.user.id,
          category: { equals: account, mode: "insensitive" },
        },
      }),
      prisma.installmentPayment.deleteMany({
        where: {
          userId: session.user.id,
          sourceAccount: { equals: account, mode: "insensitive" },
        },
      }),
      prisma.installmentPlan.deleteMany({
        where: {
          userId: session.user.id,
          sourceAccount: { equals: account, mode: "insensitive" },
        },
      }),
    ]);

    return NextResponse.json(
      {
        data: {
          transactionsDeleted: transactionsDeleted.count,
          recurringDeleted: recurringDeleted.count,
          budgetsDeleted: budgetsDeleted.count,
          installmentPaymentsDeleted: installmentPaymentsDeleted.count,
          installmentPlansDeleted: installmentPlansDeleted.count,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to force delete account", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
