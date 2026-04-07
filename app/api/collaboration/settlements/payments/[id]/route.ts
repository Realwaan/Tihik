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
  amountUsd: number;
  note: string | null;
};

type SettlementPaymentMeta = {
  linkedAccount?: string;
  linkedAccountType?: "DEBIT" | "CREDIT";
};

const SETTLEMENT_META_PREFIX = "[[trackit-meta]]";

function deserializeSettlementNote(rawNote: string | null) {
  if (!rawNote || !rawNote.startsWith(SETTLEMENT_META_PREFIX)) {
    return {
      note: rawNote,
      meta: {} as SettlementPaymentMeta,
    };
  }

  const content = rawNote.slice(SETTLEMENT_META_PREFIX.length);
  const separatorIndex = content.indexOf("\n");
  const metaRaw = separatorIndex >= 0 ? content.slice(0, separatorIndex) : content;
  const noteRaw = separatorIndex >= 0 ? content.slice(separatorIndex + 1) : "";

  try {
    const parsed = JSON.parse(metaRaw) as SettlementPaymentMeta;
    return {
      note: noteRaw.trim() || null,
      meta: {
        linkedAccount: parsed.linkedAccount?.trim(),
        linkedAccountType: parsed.linkedAccountType,
      },
    };
  } catch {
    return {
      note: rawNote,
      meta: {} as SettlementPaymentMeta,
    };
  }
}

async function getPaymentForAccess(id: string) {
  const rows = await prisma.$queryRaw<PaymentAccessRow[]>`
    SELECT
      p.id,
      p.household_id AS "householdId",
      p.from_user_id AS "fromUserId",
      p.to_user_id AS "toUserId",
      p.status AS "status",
      p.amount_usd AS "amountUsd",
      p.note AS "note"
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
      const debtPaymentNote = `Settlement Payment ${payment.id} - Debt Payment`;
      const collectionReceivedNote =
        `Settlement Payment ${payment.id} - Collection Received`;
      const linkedMeta = deserializeSettlementNote(payment.note).meta;

      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          UPDATE collaboration_settlement_payment
          SET
            status = 'PAID',
            paid_at = NOW(),
            updated_at = NOW()
          WHERE id = ${id}
        `;

        const existingDebtPayment = await transaction.transaction.findFirst({
          where: {
            userId: payment.fromUserId,
            type: "EXPENSE",
            category: "Debt Payment",
            note: debtPaymentNote,
          },
          select: { id: true },
        });

        if (!existingDebtPayment) {
          await transaction.transaction.create({
            data: {
              userId: payment.fromUserId,
              amount: payment.amountUsd,
              currency: "USD",
              type: "EXPENSE",
              category: "Debt Payment",
              note: debtPaymentNote,
              date: new Date(),
            },
          });
        }

        const existingCollection = await transaction.transaction.findFirst({
          where: {
            userId: payment.toUserId,
            type: "INCOME",
            category: "Collection Received",
            note: collectionReceivedNote,
          },
          select: { id: true },
        });

        if (!existingCollection) {
          await transaction.transaction.create({
            data: {
              userId: payment.toUserId,
              amount: payment.amountUsd,
              currency: "USD",
              type: "INCOME",
              category: "Collection Received",
              sourceAccount: linkedMeta.linkedAccount || null,
              note: collectionReceivedNote,
              date: new Date(),
            },
          });
        }
      });

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

    const debtPaymentNote = `Settlement Payment ${payment.id} - Debt Payment`;
    const collectionReceivedNote =
      `Settlement Payment ${payment.id} - Collection Received`;

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        UPDATE collaboration_settlement_payment
        SET
          status = 'PENDING',
          paid_at = NULL,
          updated_at = NOW()
        WHERE id = ${id}
      `;

      await transaction.transaction.deleteMany({
        where: {
          userId: {
            in: [payment.fromUserId, payment.toUserId],
          },
          note: {
            in: [debtPaymentNote, collectionReceivedNote],
          },
        },
      });
    });

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
