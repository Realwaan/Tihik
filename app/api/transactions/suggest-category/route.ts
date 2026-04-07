import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { suggestCategoryFromNote } from "@/lib/auto-category";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const note = (searchParams.get("note") ?? "").trim();
    const typeParam = searchParams.get("type");
    const type =
      typeParam === "INCOME" || typeParam === "TRANSFER" ? typeParam : "EXPENSE";

    if (!note || type === "TRANSFER") {
      return NextResponse.json({ data: { category: null } }, { status: 200 });
    }

    const historical = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type,
        note: { not: null },
      },
      select: {
        note: true,
        category: true,
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    const category = suggestCategoryFromNote(
      note,
      type,
      historical
        .filter((item): item is { note: string; category: string } => Boolean(item.note))
        .map((item) => ({ note: item.note, category: item.category }))
    );

    return NextResponse.json({ data: { category } }, { status: 200 });
  } catch (error) {
    console.error("Failed to suggest category", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
