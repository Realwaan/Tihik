import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getInstallmentStatus,
  normalizeDateOnly,
  withInstallmentProgress,
} from "@/lib/installments";
import { prisma } from "@/lib/prisma";
import { installmentCreateSchema } from "@/lib/validations/installment";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const statusFilter =
      status === "ACTIVE" || status === "PAUSED" || status === "COMPLETED"
        ? status
        : status === "ALL" || status === null
          ? null
          : undefined;

    if (statusFilter === undefined) {
      return NextResponse.json(
        { error: "Invalid status filter" },
        { status: 400 }
      );
    }

    const plans = await prisma.installmentPlan.findMany({
      where: {
        userId: session.user.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        payments: {
          orderBy: {
            paidAt: "desc",
          },
          take: 20,
        },
      },
      orderBy: [
        { nextDueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ data: plans.map(withInstallmentProgress) }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch installment plans", error);
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

    const parsed = installmentCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const startDate = normalizeDateOnly(parsed.data.startDate);
    const nextDueDate = normalizeDateOnly(
      parsed.data.nextDueDate ?? parsed.data.startDate
    );

    const paidAmount = parsed.data.paidAmount ?? 0;
    const paidInstallments = parsed.data.paidInstallments ?? 0;

    const status = parsed.data.status
      ? parsed.data.status
      : getInstallmentStatus({
          paidAmount,
          totalAmount: parsed.data.totalAmount,
          paidInstallments,
          totalInstallments: parsed.data.totalInstallments,
          currentStatus: "ACTIVE",
        });

    const created = await prisma.installmentPlan.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        totalAmount: parsed.data.totalAmount,
        paidAmount,
        currency: parsed.data.currency,
        totalInstallments: parsed.data.totalInstallments,
        paidInstallments,
        installmentAmount: parsed.data.installmentAmount,
        frequency: parsed.data.frequency,
        interval: parsed.data.interval,
        startDate,
        nextDueDate,
        sourceAccount: parsed.data.sourceAccount?.trim() || null,
        accountType: parsed.data.accountType,
        note: parsed.data.note?.trim() || null,
        status,
      },
      include: {
        payments: {
          orderBy: {
            paidAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({ data: withInstallmentProgress(created) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create installment plan", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
