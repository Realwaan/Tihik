import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type PreferencePayload = {
  budgetNearEnabled?: boolean;
  budgetOverEnabled?: boolean;
  smartSpikeEnabled?: boolean;
  smartLargeExpenseEnabled?: boolean;
  smartCategorySurgeEnabled?: boolean;
};

async function getOrCreatePreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.notificationPreference.create({
    data: { userId },
  });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getOrCreatePreferences(session.user.id);
    return NextResponse.json({ data: preferences }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch notification preferences", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as PreferencePayload | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const allowedKeys = [
      "budgetNearEnabled",
      "budgetOverEnabled",
      "smartSpikeEnabled",
      "smartLargeExpenseEnabled",
      "smartCategorySurgeEnabled",
    ] as const;

    const updates: PreferencePayload = {};
    for (const key of allowedKeys) {
      if (key in body) {
        if (typeof body[key] !== "boolean") {
          return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
        }
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid preference fields provided" }, { status: 400 });
    }

    await getOrCreatePreferences(session.user.id);
    const preferences = await prisma.notificationPreference.update({
      where: { userId: session.user.id },
      data: updates,
    });

    return NextResponse.json({ data: preferences }, { status: 200 });
  } catch (error) {
    console.error("Failed to update notification preferences", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}