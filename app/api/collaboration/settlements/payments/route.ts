import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeCollaborationAuditEvent } from "@/lib/collaboration-audit";
import { userHasHouseholdAccess } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { settlementPaymentCreateSchema } from "@/lib/validations/collaboration";

type SettlementPaymentRow = {
  id: string;
  householdId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountUsd: number;
  status: "PENDING" | "PAID";
  dueDate: Date;
  lastReminderAt: Date | null;
  reminderCount: number;
  paidAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function verifyMembersInHousehold(
  householdId: string,
  fromUserId: string,
  toUserId: string
) {
  const members = await prisma.householdMember.findMany({
    where: { householdId, userId: { in: [fromUserId, toUserId] } },
    select: { userId: true },
  });

  return members.length === 2;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    if (!householdId) {
      return NextResponse.json({ error: "householdId is required" }, { status: 400 });
    }

    const access = await userHasHouseholdAccess(session.user.id, householdId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payments = await prisma.$queryRaw<SettlementPaymentRow[]>`
      SELECT
        p.id,
        p.household_id AS "householdId",
        p.from_user_id AS "fromUserId",
        COALESCE(from_user.name, from_user.email, 'Member') AS "fromName",
        p.to_user_id AS "toUserId",
        COALESCE(to_user.name, to_user.email, 'Member') AS "toName",
        p.amount_usd AS "amountUsd",
        p.status AS "status",
        p.due_date AS "dueDate",
        p.last_reminder_at AS "lastReminderAt",
        p.reminder_count AS "reminderCount",
        p.paid_at AS "paidAt",
        p.note AS "note",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM collaboration_settlement_payment p
      INNER JOIN "User" from_user ON from_user.id = p.from_user_id
      INNER JOIN "User" to_user ON to_user.id = p.to_user_id
      WHERE p.household_id = ${householdId}
      ORDER BY
        CASE WHEN p.status = 'PENDING' THEN 0 ELSE 1 END,
        p.due_date ASC,
        p.created_at DESC
    `;

    return NextResponse.json({ data: payments }, { status: 200 });
  } catch (error) {
    console.error("Failed to load settlement payments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const parsed = settlementPaymentCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.fromUserId === parsed.data.toUserId) {
      return NextResponse.json(
        { error: "Payer and receiver must be different members" },
        { status: 400 }
      );
    }

    const access = await userHasHouseholdAccess(session.user.id, parsed.data.householdId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membersValid = await verifyMembersInHousehold(
      parsed.data.householdId,
      parsed.data.fromUserId,
      parsed.data.toUserId
    );
    if (!membersValid) {
      return NextResponse.json(
        { error: "Both users must be members of the selected household" },
        { status: 400 }
      );
    }

    const createdId = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO collaboration_settlement_payment (
        id,
        household_id,
        from_user_id,
        to_user_id,
        created_by_user_id,
        amount_usd,
        status,
        due_date,
        note,
        created_at,
        updated_at
      )
      VALUES (
        ${createdId},
        ${parsed.data.householdId},
        ${parsed.data.fromUserId},
        ${parsed.data.toUserId},
        ${session.user.id},
        ${parsed.data.amountUsd},
        'PENDING',
        ${parsed.data.dueDate},
        ${parsed.data.note ?? null},
        NOW(),
        NOW()
      )
    `;

    await writeCollaborationAuditEvent({
      householdId: parsed.data.householdId,
      actorUserId: session.user.id,
      targetUserId: parsed.data.fromUserId,
      action: "SETTLEMENT_TRACKED",
      entityType: "SettlementPayment",
      entityId: createdId,
      details: `Tracked settlement of $${parsed.data.amountUsd.toFixed(2)} due ${parsed.data.dueDate.toISOString().slice(0, 10)}`,
    });

    return NextResponse.json({ data: { id: createdId } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create settlement payment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
