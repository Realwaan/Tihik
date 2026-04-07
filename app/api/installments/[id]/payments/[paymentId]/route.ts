import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getInstallmentStatus, withInstallmentProgress } from "@/lib/installments";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, paymentId } = await context.params;

    const payment = await prisma.installmentPayment.findFirst({
      where: {
        id: paymentId,
        planId: id,
        userId: session.user.id,
      },
      include: {
        plan: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Installment payment not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (payment.linkedTransactionId) {
        await tx.transaction.deleteMany({
          where: {
            id: payment.linkedTransactionId,
            userId: session.user.id,
          },
        });
      }

      await tx.installmentPayment.delete({
        where: {
          id: payment.id,
        },
      });

      const nextPaidAmount = Math.max(0, payment.plan.paidAmount - payment.amount);
      const nextPaidInstallments = Math.max(
        0,
        payment.plan.paidInstallments - payment.installmentsCovered
      );

      const status = getInstallmentStatus({
        paidAmount: nextPaidAmount,
        totalAmount: payment.plan.totalAmount,
        paidInstallments: nextPaidInstallments,
        totalInstallments: payment.plan.totalInstallments,
        currentStatus: payment.plan.status === "PAUSED" ? "PAUSED" : "ACTIVE",
      });

      const mostRecentPayment = await tx.installmentPayment.findFirst({
        where: {
          planId: payment.planId,
        },
        orderBy: {
          paidAt: "desc",
        },
        select: {
          paidAt: true,
        },
      });

      const updatedPlan = await tx.installmentPlan.update({
        where: {
          id: payment.planId,
        },
        data: {
          paidAmount: nextPaidAmount,
          paidInstallments: nextPaidInstallments,
          status,
          lastPaymentAt: mostRecentPayment?.paidAt ?? null,
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

      return updatedPlan;
    });

    return NextResponse.json(
      { data: withInstallmentProgress(result) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete installment payment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
