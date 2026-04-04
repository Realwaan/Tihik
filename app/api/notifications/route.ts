import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getNotificationsForUser } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await getNotificationsForUser(session.user.id);
    return NextResponse.json({ data: notifications }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
