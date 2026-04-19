import { NextResponse } from "next/server";

const DISABLED_MESSAGE = "Bank API integration is currently disabled.";

export async function GET() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 410 });
}
