import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  assertBankIntegrationAccountAllowed,
  assertReadOnlyScope,
  bankConnectionSelect,
  getBankProviderFromInput,
} from "@/lib/bank-readonly";
import { encryptBankToken } from "@/lib/bank-token-crypto";
import { prisma } from "@/lib/prisma";
import { bankConnectionCreateSchema } from "@/lib/validations/bank";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.bankConnection.findMany({
      where: { userId: session.user.id },
      select: bankConnectionSelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: connections }, { status: 200 });
  } catch (error) {
    console.error("Failed to list bank connections", error);
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

    const parsed = bankConnectionCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const provider = getBankProviderFromInput(parsed.data.provider);

    assertReadOnlyScope(parsed.data.tokenScope);
    assertBankIntegrationAccountAllowed({
      accountLabel: parsed.data.accountLabel,
      providerAccountId: parsed.data.providerAccountId,
    });

    const encryptedAccessToken = encryptBankToken(parsed.data.accessToken);
    const encryptedRefreshToken = parsed.data.refreshToken
      ? encryptBankToken(parsed.data.refreshToken)
      : null;

    const connection = await prisma.bankConnection.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId: session.user.id,
          provider,
          providerAccountId: parsed.data.providerAccountId ?? "",
        },
      },
      create: {
        userId: session.user.id,
        provider,
        providerAccountId: parsed.data.providerAccountId ?? "",
        accountLabel: parsed.data.accountLabel ?? null,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenScope: parsed.data.tokenScope,
        tokenExpiresAt: parsed.data.tokenExpiresAt ?? null,
      },
      update: {
        accountLabel: parsed.data.accountLabel ?? null,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenScope: parsed.data.tokenScope,
        tokenExpiresAt: parsed.data.tokenExpiresAt ?? null,
      },
      select: bankConnectionSelect,
    });

    return NextResponse.json({ data: connection }, { status: 200 });
  } catch (error) {
    console.error("Failed to save bank connection", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save bank connection";

    if (
      message.includes("scope") ||
      message.includes("BANK_TOKEN_ENCRYPTION_KEY") ||
      message.includes("credit-card accounts only")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
