import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";

export async function recordCurrencyConversionHistory(args: {
  userId: string;
  source: string;
  fromCurrency: string;
  toCurrency: string;
  amountFrom: number;
  amountTo: number;
  rateUsed: number;
  lockedRate: boolean;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO currency_conversion_history (
        id,
        user_id,
        source,
        from_currency,
        to_currency,
        amount_from,
        amount_to,
        rate_used,
        locked_rate,
        created_at
      )
      VALUES (
        ${randomUUID()},
        ${args.userId},
        ${args.source},
        ${args.fromCurrency},
        ${args.toCurrency},
        ${args.amountFrom},
        ${args.amountTo},
        ${args.rateUsed},
        ${args.lockedRate},
        NOW()
      )
    `;
  } catch (error) {
    console.error("Failed to record currency conversion history", error);
  }
}
