import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeCollaborationAuditEvent } from "@/lib/collaboration-audit";
import { userHasHouseholdAccess } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { settlementPaymentActionSchema } from "@/lib/validations/collaboration";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PaymentAccessRow = {
  id: string;
  householdId: string;
  fromUserId: string;
  toUserId: string;
  status: "PENDING" | "PAID";
};

async function getPaymentForAccess(id: string) {
  const rows = await prisma.$queryRaw<PaymentAccessRow[]>`
    SELECT
      p.id,
      p.household_id AS "householdId",
      p.from_user_id AS "fromUserId",
      p.to_user_id AS "toUserId",
      p.status AS "status"
    FROM collaboration_settlement_payment p
    WHERE p.id = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const payment = await getPaymentForAccess(id);

    if (!payment) {
      return NextResponse.json({ error: "Settlement payment not found" }, { status: 404 });
    }

    const access = await userHasHouseholdAccess(session.user.id, payment.householdId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isParticipant =
      session.user.id === payment.fromUserId || session.user.id === payment.toUserId;
    if (!isParticipant && access.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only participants or household owner can update this payment" },
        { status: 403 }
      );
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = settlementPaymentActionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.action === "SEND_REMINDER") {
      await prisma.$executeRaw`
        UPDATE collaboration_settlement_payment
        SET
          last_reminder_at = NOW(),
          reminder_count = reminder_count + 1,
          updated_at = NOW()
        WHERE id = ${id}
      `;

      await writeCollaborationAuditEvent({
        householdId: payment.householdId,
        actorUserId: session.user.id,
        targetUserId: payment.fromUserId,
        action: "SETTLEMENT_REMINDER_SENT",
        entityType: "SettlementPayment",
        entityId: payment.id,
        details: "Sent settlement reminder",
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (parsed.data.action === "MARK_PAID") {
      await prisma.$executeRaw`
        UPDATE collaboration_settlement_payment
        SET
          status = 'PAID',
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      await writeCollaborationAuditEvent({
        householdId: payment.householdId,
        actorUserId: session.user.id,
        targetUserId: payment.toUserId,
        action: "SETTLEMENT_MARKED_PAID",
        entityType: "SettlementPayment",
        entityId: payment.id,
        details: "Marked settlement as paid",
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    await prisma.$executeRaw`
      UPDATE collaboration_settlement_payment
      SET
        status = 'PENDING',
        paid_at = NULL,
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await writeCollaborationAuditEvent({
      householdId: payment.householdId,
      actorUserId: session.user.id,
      targetUserId: payment.fromUserId,
      action: "SETTLEMENT_REOPENED",
      entityType: "SettlementPayment",
      entityId: payment.id,
      details: "Reopened settlement to pending",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to update settlement payment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
