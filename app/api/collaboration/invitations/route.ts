import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeCollaborationAuditEvent } from "@/lib/collaboration-audit";
import {
  getUserEmailVerificationStatus,
  userHasHouseholdAccess,
} from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { householdInviteSchema } from "@/lib/validations/collaboration";

export async function POST(request: NextRequest) {
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
          error: "Please verify your email before inviting members.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = householdInviteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const access = await userHasHouseholdAccess(
      session.user.id,
      parsed.data.householdId
    );

    if (!access || access.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    const invitedUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User with this email does not exist" },
        { status: 404 }
      );
    }

    if (!invitedUser.emailVerified) {
      return NextResponse.json(
        { error: "The invited user must verify their email before joining collaboration groups." },
        { status: 409 }
      );
    }

    const membership = await prisma.householdMember.upsert({
      where: {
        householdId_userId: {
          householdId: parsed.data.householdId,
          userId: invitedUser.id,
        },
      },
      update: {},
      create: {
        householdId: parsed.data.householdId,
        userId: invitedUser.id,
        role: "MEMBER",
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    await writeCollaborationAuditEvent({
      householdId: parsed.data.householdId,
      actorUserId: session.user.id,
      targetUserId: invitedUser.id,
      action: "MEMBER_INVITED",
      entityType: "HouseholdMember",
      entityId: membership.id,
      details: `Invited ${invitedUser.email ?? invitedUser.name ?? "member"}`,
    });

    return NextResponse.json({ data: membership }, { status: 200 });
  } catch (error) {
    console.error("Failed to invite household member", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
