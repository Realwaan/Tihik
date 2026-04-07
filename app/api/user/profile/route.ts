import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Currency } from "@prisma/client";
import { convertCurrency } from "@/lib/currency";
import { recordCurrencyConversionHistory } from "@/lib/currency-history";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        preferredCurrency: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Session user was not found. Please sign in again.",
          code: "SESSION_STALE",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({ user, converted: false }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user profile", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, preferredCurrency, convertExistingData } = body;

    if (!name && !email && !preferredCurrency) {
      return NextResponse.json(
        { error: "At least one field is required" },
        { status: 400 }
      );
    }

    const allowedCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"];
    if (preferredCurrency && !allowedCurrencies.includes(preferredCurrency)) {
      return NextResponse.json(
        { error: "Invalid preferred currency" },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      preferredCurrency?: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
    } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (preferredCurrency) {
      updateData.preferredCurrency = preferredCurrency;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        preferredCurrency: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Session user was not found. Please sign in again.",
          code: "SESSION_STALE",
        },
        { status: 401 }
      );
    }

    const targetCurrency =
      (preferredCurrency as Currency | undefined) ?? currentUser.preferredCurrency;
    const shouldConvertExisting =
      targetCurrency !== currentUser.preferredCurrency && convertExistingData !== false;

    const conversionHistoryEntries: Array<{
      source: string;
      amountFrom: number;
      amountTo: number;
      rateUsed: number;
    }> = [];

    const user = await prisma.$transaction(async (tx) => {
      if (shouldConvertExisting) {
        const [transactions, recurringTemplates, sharedExpenses] = await Promise.all([
          tx.transaction.findMany({
            where: { userId: session.user.id },
            select: { id: true, amount: true, currency: true },
          }),
          tx.recurringTransaction.findMany({
            where: { userId: session.user.id },
            select: { id: true, amount: true, currency: true },
          }),
          tx.sharedExpense.findMany({
            where: { paidByUserId: session.user.id },
            select: { id: true, amount: true, currency: true },
          }),
        ]);

        await Promise.all([
          ...transactions.map((item) =>
            tx.transaction.update({
              where: { id: item.id },
              data: {
                amount: convertCurrency(
                  item.amount,
                  item.currency,
                  targetCurrency
                ),
                currency: targetCurrency,
              },
            })
          ),
          ...recurringTemplates.map((item) =>
            tx.recurringTransaction.update({
              where: { id: item.id },
              data: {
                amount: convertCurrency(
                  item.amount,
                  item.currency,
                  targetCurrency
                ),
                currency: targetCurrency,
              },
            })
          ),
          ...sharedExpenses.map((item) =>
            tx.sharedExpense.update({
              where: { id: item.id },
              data: {
                amount: convertCurrency(
                  item.amount,
                  item.currency,
                  targetCurrency
                ),
                currency: targetCurrency,
              },
            })
          ),
        ]);

        const transactionTotalFrom = transactions.reduce((sum, item) => sum + item.amount, 0);
        const recurringTotalFrom = recurringTemplates.reduce((sum, item) => sum + item.amount, 0);
        const sharedTotalFrom = sharedExpenses.reduce((sum, item) => sum + item.amount, 0);

        const sourceCurrency = currentUser.preferredCurrency;

        const rateUsed = convertCurrency(1, sourceCurrency, targetCurrency);

        if (transactionTotalFrom > 0) {
          conversionHistoryEntries.push({
            source: "PROFILE_BULK_TRANSACTIONS",
            amountFrom: transactionTotalFrom,
            amountTo: convertCurrency(transactionTotalFrom, sourceCurrency, targetCurrency),
            rateUsed,
          });
        }

        if (recurringTotalFrom > 0) {
          conversionHistoryEntries.push({
            source: "PROFILE_BULK_RECURRING",
            amountFrom: recurringTotalFrom,
            amountTo: convertCurrency(recurringTotalFrom, sourceCurrency, targetCurrency),
            rateUsed,
          });
        }

        if (sharedTotalFrom > 0) {
          conversionHistoryEntries.push({
            source: "PROFILE_BULK_SHARED_EXPENSES",
            amountFrom: sharedTotalFrom,
            amountTo: convertCurrency(sharedTotalFrom, sourceCurrency, targetCurrency),
            rateUsed,
          });
        }
      }

      return tx.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          preferredCurrency: true,
          createdAt: true,
        },
      });
    });

    if (shouldConvertExisting && conversionHistoryEntries.length > 0) {
      await Promise.all(
        conversionHistoryEntries.map((item) =>
          recordCurrencyConversionHistory({
            userId: session.user.id,
            source: item.source,
            fromCurrency: currentUser.preferredCurrency,
            toCurrency: targetCurrency,
            amountFrom: item.amountFrom,
            amountTo: item.amountTo,
            rateUsed: item.rateUsed,
            lockedRate: true,
          })
        )
      );
    }

    return NextResponse.json({ user, converted: shouldConvertExisting }, { status: 200 });
  } catch (error) {
    console.error("Failed to update user profile", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
