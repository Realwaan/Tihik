import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
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