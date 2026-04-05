import { NextRequest, NextResponse } from "next/server";

import { verifyEmailToken } from "@/lib/email-verification";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    const invalidUrl = new URL("/signin?verified=invalid", request.url);
    return NextResponse.redirect(invalidUrl);
  }

  try {
    const verified = await verifyEmailToken(email, token);
    const redirectUrl = new URL(
      verified ? "/signin?verified=1" : "/signin?verified=invalid",
      request.url
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Failed to verify email token", error);
    const failedUrl = new URL("/signin?verified=invalid", request.url);
    return NextResponse.redirect(failedUrl);
  }
}
