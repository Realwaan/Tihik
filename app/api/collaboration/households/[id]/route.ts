import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeCollaborationAuditEvent } from "@/lib/collaboration-audit";
import { getUserEmailVerificationStatus } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verificationStatus = await getUserEmailVerificationStatus(session.user.id);
    if (verificationStatus === "MISSING") {
      return NextResponse.json(
        {
          error: "Session user was not found. Please sign in again.",
          code: "SESSION_STALE",
        },
        { status: 401 }
      );
    }

    if (verificationStatus === "UNVERIFIED") {
      return NextResponse.json(
        {
          error: "Please verify your email before deleting households.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const household = await prisma.household.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    if (household.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the household owner can delete this household" },
        { status: 403 }
      );
    }

    await writeCollaborationAuditEvent({
      householdId: household.id,
      actorUserId: session.user.id,
      action: "HOUSEHOLD_DELETED",
      entityType: "Household",
      entityId: household.id,
      details: "Deleted household",
    });

    await prisma.household.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete household", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}