import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { userHasHouseholdAccess } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { householdInviteSchema } from "@/lib/validations/collaboration";

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
      select: { id: true, email: true, name: true },
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User with this email does not exist" },
        { status: 404 }
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

    return NextResponse.json({ data: membership }, { status: 200 });
  } catch (error) {
    console.error("Failed to invite household member", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
