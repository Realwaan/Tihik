import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  bankConnectionSelect,
  getBankProviderFromInput,
  runBankTransactionsSync,
} from "@/lib/bank-readonly";
import { decryptBankToken } from "@/lib/bank-token-crypto";
import { prisma } from "@/lib/prisma";
import { bankSyncRequestSchema } from "@/lib/validations/bank";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));

    const parsed = bankSyncRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const where = {
      userId: session.user.id,
      ...(parsed.data.connectionId
        ? { id: parsed.data.connectionId }
        : parsed.data.provider
          ? { provider: getBankProviderFromInput(parsed.data.provider) }
          : {}),
    };

    const connection = await prisma.bankConnection.findFirst({
      where,
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Bank connection not found" },
        { status: 404 }
      );
    }

    const accessToken = decryptBankToken(connection.encryptedAccessToken);

    const result = await runBankTransactionsSync({
      userId: session.user.id,
      connection,
      accessToken,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });

    const updatedConnection = await prisma.bankConnection.findUnique({
      where: { id: connection.id },
      select: bankConnectionSelect,
    });

    return NextResponse.json(
      {
        data: {
          ...result,
          connection: updatedConnection,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to sync bank transactions", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync bank transactions";

    if (
      message.includes("scope") ||
      message.includes("BANK_API_BASE_URL") ||
      message.includes("encrypted token")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
