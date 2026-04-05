import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeCollaborationAuditEvent } from "@/lib/collaboration-audit";
import { isUserEmailVerified } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";
import { householdCreateSchema } from "@/lib/validations/collaboration";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verified = await isUserEmailVerified(session.user.id);
    if (!verified) {
      return NextResponse.json(
        { error: "Please verify your email before creating collaboration groups." },
        { status: 403 }
      );
    }

    const households = await prisma.householdMember.findMany({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        data: households.map((item) => ({
          membershipId: item.id,
          role: item.role,
          household: item.household,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load households", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const parsed = householdCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const household = await prisma.household.create({
      data: {
        name: parsed.data.name,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    await writeCollaborationAuditEvent({
      householdId: household.id,
      actorUserId: session.user.id,
      action: "HOUSEHOLD_CREATED",
      entityType: "Household",
      entityId: household.id,
      details: `Created household ${household.name}`,
    });

    return NextResponse.json({ data: household }, { status: 201 });
  } catch (error) {
    console.error("Failed to create household", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
