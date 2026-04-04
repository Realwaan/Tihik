import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { userHasHouseholdAccess } from "@/lib/collaboration";
import { convertToUSD } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

type BalanceItem = {
  userId: string;
  name: string;
  balanceUsd: number;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const access = await userHasHouseholdAccess(session.user.id, householdId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        expenses: {
          include: {
            paidByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    const balances = new Map<string, BalanceItem>();
    for (const member of household.members) {
      balances.set(member.user.id, {
        userId: member.user.id,
        name: member.user.name || member.user.email || "Member",
        balanceUsd: 0,
      });
    }

    for (const expense of household.expenses) {
      const amountUsd = convertToUSD(expense.amount, expense.currency);
      const splitCount = household.members.length || 1;
      const share = amountUsd / splitCount;

      for (const member of household.members) {
        const current = balances.get(member.user.id);
        if (current) {
          current.balanceUsd -= share;
        }
      }

      const payer = balances.get(expense.paidByUserId);
      if (payer) {
        payer.balanceUsd += amountUsd;
      }
    }

    const creditors = Array.from(balances.values())
      .filter((item) => item.balanceUsd > 0.01)
      .sort((a, b) => b.balanceUsd - a.balanceUsd);
    const debtors = Array.from(balances.values())
      .filter((item) => item.balanceUsd < -0.01)
      .sort((a, b) => a.balanceUsd - b.balanceUsd);

    const suggestions: Array<{
      fromUserId: string;
      fromName: string;
      toUserId: string;
      toName: string;
      amountUsd: number;
    }> = [];

    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      const amount = Math.min(
        Math.abs(debtor.balanceUsd),
        Math.abs(creditor.balanceUsd)
      );

      suggestions.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amountUsd: Number(amount.toFixed(2)),
      });

      debtor.balanceUsd += amount;
      creditor.balanceUsd -= amount;

      if (Math.abs(debtor.balanceUsd) <= 0.01) {
        debtorIndex += 1;
      }
      if (Math.abs(creditor.balanceUsd) <= 0.01) {
        creditorIndex += 1;
      }
    }

    return NextResponse.json(
      {
        data: {
          balancesUsd: Array.from(balances.values()).map((item) => ({
            ...item,
            balanceUsd: Number(item.balanceUsd.toFixed(2)),
          })),
          suggestions,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to calculate settlements", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
