import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";

export type CollaborationAuditAction =
  | "HOUSEHOLD_CREATED"
  | "HOUSEHOLD_DELETED"
  | "MEMBER_INVITED"
  | "EXPENSE_ADDED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "SETTLEMENT_TRACKED"
  | "SETTLEMENT_REMINDER_SENT"
  | "SETTLEMENT_MARKED_PAID"
  | "SETTLEMENT_REOPENED";

export async function writeCollaborationAuditEvent(args: {
  householdId: string;
  actorUserId: string;
  action: CollaborationAuditAction;
  targetUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO collaboration_audit_event (
        id,
        household_id,
        actor_user_id,
        target_user_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at
      )
      VALUES (
        ${randomUUID()},
        ${args.householdId},
        ${args.actorUserId},
        ${args.targetUserId ?? null},
        ${args.action},
        ${args.entityType ?? null},
        ${args.entityId ?? null},
        ${args.details ?? null},
        NOW()
      )
    `;
  } catch (error) {
    console.error("Failed to write collaboration audit event", error);
  }
}
