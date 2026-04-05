import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { userHasHouseholdAccess } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";

type AuditEventRow = {
  id: string;
  householdId: string;
  action: string;
  details: string | null;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string;
  actorName: string;
  targetUserId: string | null;
  targetName: string | null;
  createdAt: Date;
};

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

    const events = await prisma.$queryRaw<AuditEventRow[]>`
      SELECT
        e.id,
        e.household_id AS "householdId",
        e.action,
        e.details,
        e.entity_type AS "entityType",
        e.entity_id AS "entityId",
        e.actor_user_id AS "actorUserId",
        COALESCE(actor.name, actor.email, 'Member') AS "actorName",
        e.target_user_id AS "targetUserId",
        COALESCE(target_user.name, target_user.email) AS "targetName",
        e.created_at AS "createdAt"
      FROM collaboration_audit_event e
      INNER JOIN "User" actor ON actor.id = e.actor_user_id
      LEFT JOIN "User" target_user ON target_user.id = e.target_user_id
      WHERE e.household_id = ${householdId}
      ORDER BY e.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ data: events }, { status: 200 });
  } catch (error) {
    console.error("Failed to load collaboration audit history", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
