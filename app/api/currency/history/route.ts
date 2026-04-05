import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type CurrencyHistoryRow = {
  id: string;
  source: string;
  fromCurrency: string;
  toCurrency: string;
  amountFrom: number;
  amountTo: number;
  rateUsed: number;
  lockedRate: boolean;
  createdAt: Date;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.$queryRaw<CurrencyHistoryRow[]>`
      SELECT
        id,
        source,
        from_currency AS "fromCurrency",
        to_currency AS "toCurrency",
        amount_from AS "amountFrom",
        amount_to AS "amountTo",
        rate_used AS "rateUsed",
        locked_rate AS "lockedRate",
        created_at AS "createdAt"
      FROM currency_conversion_history
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch currency conversion history", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
