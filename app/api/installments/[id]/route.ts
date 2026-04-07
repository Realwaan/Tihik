import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getInstallmentStatus,
  normalizeDateOnly,
  withInstallmentProgress,
} from "@/lib/installments";
import { prisma } from "@/lib/prisma";
import { installmentUpdateSchema } from "@/lib/validations/installment";

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

    const existing = await prisma.installmentPlan.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        payments: {
          orderBy: {
            paidAt: "desc",
          },
          take: 20,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Installment plan not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = installmentUpdateSchema.safeParse(json);

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

    const nextTotalAmount = parsed.data.totalAmount ?? existing.totalAmount;
    const nextTotalInstallments =
      parsed.data.totalInstallments ?? existing.totalInstallments;
    const nextPaidAmount = parsed.data.paidAmount ?? existing.paidAmount;
    const nextPaidInstallments =
      parsed.data.paidInstallments ?? existing.paidInstallments;

    const status =
      parsed.data.status ??
      getInstallmentStatus({
        paidAmount: nextPaidAmount,
        totalAmount: nextTotalAmount,
        paidInstallments: nextPaidInstallments,
        totalInstallments: nextTotalInstallments,
        currentStatus: existing.status,
      });

    const updated = await prisma.installmentPlan.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.totalAmount !== undefined
          ? { totalAmount: parsed.data.totalAmount }
          : {}),
        ...(parsed.data.installmentAmount !== undefined
          ? { installmentAmount: parsed.data.installmentAmount }
          : {}),
        ...(parsed.data.totalInstallments !== undefined
          ? { totalInstallments: parsed.data.totalInstallments }
          : {}),
        ...(parsed.data.paidAmount !== undefined
          ? { paidAmount: parsed.data.paidAmount }
          : {}),
        ...(parsed.data.paidInstallments !== undefined
          ? { paidInstallments: parsed.data.paidInstallments }
          : {}),
        ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency } : {}),
        ...(parsed.data.frequency !== undefined
          ? { frequency: parsed.data.frequency }
          : {}),
        ...(parsed.data.interval !== undefined ? { interval: parsed.data.interval } : {}),
        ...(parsed.data.startDate !== undefined
          ? { startDate: normalizeDateOnly(parsed.data.startDate) }
          : {}),
        ...(parsed.data.nextDueDate !== undefined
          ? {
              nextDueDate: parsed.data.nextDueDate
                ? normalizeDateOnly(parsed.data.nextDueDate)
                : existing.nextDueDate,
            }
          : {}),
        ...(parsed.data.sourceAccount !== undefined
          ? { sourceAccount: parsed.data.sourceAccount?.trim() || null }
          : {}),
        ...(parsed.data.accountType !== undefined
          ? { accountType: parsed.data.accountType }
          : {}),
        ...(parsed.data.note !== undefined
          ? { note: parsed.data.note?.trim() || null }
          : {}),
        status,
      },
      include: {
        payments: {
          orderBy: {
            paidAt: "desc",
          },
          take: 20,
        },
      },
    });

    return NextResponse.json({ data: withInstallmentProgress(updated) }, { status: 200 });
  } catch (error) {
    console.error("Failed to update installment plan", error);
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

    const existing = await prisma.installmentPlan.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Installment plan not found" }, { status: 404 });
    }

    await prisma.installmentPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete installment plan", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
