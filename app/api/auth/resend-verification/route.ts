import { NextRequest, NextResponse } from "next/server";

import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const email = (json?.email as string | undefined)?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        password: true,
      },
    });

    if (!user || !user.email || !user.password) {
      return NextResponse.json(
        { message: "If the account exists, a confirmation email has been sent." },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "This email is already verified." },
        { status: 200 }
      );
    }

    const tokenResult = await createEmailVerificationToken(user.email);
    const delivery = await sendVerificationEmail(user.email, tokenResult.token);

    return NextResponse.json(
      {
        message: "Verification email sent. Please check your inbox.",
        delivered: delivery.delivered,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to resend verification email", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
