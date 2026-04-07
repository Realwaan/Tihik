import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  addInstallmentFrequency,
  getInstallmentStatus,
  normalizeDateOnly,
  withInstallmentProgress,
} from "@/lib/installments";
import { prisma } from "@/lib/prisma";
import { installmentPaymentCreateSchema } from "@/lib/validations/installment";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const plan = await prisma.installmentPlan.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Installment plan not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = installmentPaymentCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (
      parsed.data.amount === 0 &&
      parsed.data.installmentsCovered === 0 &&
      !parsed.data.note?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Provide amount, covered installments, or a note when logging a zero-value payment",
        },
        { status: 400 }
      );
    }

    const paidAt = parsed.data.paidAt
      ? normalizeDateOnly(parsed.data.paidAt)
      : new Date();
    const currency = parsed.data.currency ?? plan.currency;
    const sourceAccount = parsed.data.sourceAccount?.trim() || plan.sourceAccount;

    const result = await prisma.$transaction(async (tx) => {
      let linkedTransactionId: string | null = null;

      if (parsed.data.createLinkedTransaction && parsed.data.amount > 0) {
        const linkedTransaction = await tx.transaction.create({
          data: {
            userId: session.user.id,
            amount: parsed.data.amount,
            currency,
            type: "EXPENSE",
            category: plan.title,
            sourceAccount: sourceAccount || null,
            note: parsed.data.note?.trim() || `Installment payment: ${plan.title}`,
            date: paidAt,
            sourceInstallmentId: plan.id,
          },
        });

        linkedTransactionId = linkedTransaction.id;
      }

      const payment = await tx.installmentPayment.create({
        data: {
          planId: plan.id,
          userId: session.user.id,
          amount: parsed.data.amount,
          currency,
          installmentsCovered: parsed.data.installmentsCovered,
          paidAt,
          sourceAccount: sourceAccount || null,
          note: parsed.data.note?.trim() || null,
          linkedTransactionId,
        },
      });

      const nextPaidAmount = plan.paidAmount + parsed.data.amount;
      const nextPaidInstallments =
        plan.paidInstallments + parsed.data.installmentsCovered;

      let nextDueDate = plan.nextDueDate;
      if (parsed.data.nextDueDate) {
        nextDueDate = normalizeDateOnly(parsed.data.nextDueDate);
      } else if (parsed.data.advanceNextDue) {
        nextDueDate = addInstallmentFrequency(
          plan.nextDueDate,
          plan.frequency,
          plan.interval
        );
      }

      const status = getInstallmentStatus({
        paidAmount: nextPaidAmount,
        totalAmount: plan.totalAmount,
        paidInstallments: nextPaidInstallments,
        totalInstallments: plan.totalInstallments,
        currentStatus: plan.status,
      });

      const updatedPlan = await tx.installmentPlan.update({
        where: {
          id: plan.id,
        },
        data: {
          paidAmount: nextPaidAmount,
          paidInstallments: nextPaidInstallments,
          nextDueDate,
          lastPaymentAt: paidAt,
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

      return {
        payment,
        updatedPlan,
      };
    });

    return NextResponse.json(
      {
        data: {
          plan: withInstallmentProgress(result.updatedPlan),
          payment: result.payment,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to log installment payment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
