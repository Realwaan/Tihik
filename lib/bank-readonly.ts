import {
  BankConnection,
  BankIntegrationProvider,
  Currency,
  Prisma,
  TransactionType,
} from "@prisma/client";

import {
  BANK_INTEGRATION_CREDIT_ONLY_MESSAGE,
  isCreditCardLikeAccount,
} from "@/lib/bank-account-eligibility";
import { prisma } from "@/lib/prisma";

type BankRemoteTransaction = {
  id: string;
  amount: number;
  currency?: Currency;
  description: string;
  date: string;
  direction?: "debit" | "credit";
  category?: string;
  accountName?: string;
};

type BankFetchResponse = {
  transactions: BankRemoteTransaction[];
  nextCursor?: string | null;
};

type BankClient = {
  fetchTransactions: (input: {
    accessToken: string;
    cursor?: string | null;
    startDate?: string;
    endDate?: string;
  }) => Promise<BankFetchResponse>;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseBankTransactionDate(value: string): Date {
  const trimmed = value.trim();

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    const [yearText, monthText, dayText] = trimmed.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  return new Date(value);
}

function normalizeScope(scope: string | null | undefined): string {
  return (scope ?? "").trim().toLowerCase();
}

export function assertReadOnlyScope(scope: string | null | undefined) {
  const normalized = normalizeScope(scope);

  if (!normalized) {
    throw new Error("Token scope is required and must include transaction read access");
  }

  const hasRead = /(transaction[s]?:read|transactions\.read|read:transactions|accounts:read|read:accounts)/i.test(
    normalized
  );
  const hasWrite = /(write|payment[s]?|transfer[s]?|beneficiar(y|ies)|admin)/i.test(normalized);

  if (!hasRead) {
    throw new Error("Token scope must include transaction read access");
  }

  if (hasWrite) {
    throw new Error("Token scope must be read-only; write/payment/admin scopes are not allowed");
  }
}

export function assertBankIntegrationAccountAllowed(input: {
  accountLabel?: string | null;
  providerAccountId?: string | null;
}) {
  const candidateIdentity =
    input.accountLabel?.trim() || input.providerAccountId?.trim() || "";

  if (!isCreditCardLikeAccount(candidateIdentity)) {
    throw new Error(BANK_INTEGRATION_CREDIT_ONLY_MESSAGE);
  }
}

function inferTransactionType(
  tx: BankRemoteTransaction,
  normalizedAmount: number
): TransactionType {
  if (tx.direction === "credit") {
    return "INCOME";
  }

  if (tx.direction === "debit") {
    return "EXPENSE";
  }

  return normalizedAmount >= 0 ? "INCOME" : "EXPENSE";
}

function normalizeCurrency(input: Currency | undefined): Currency {
  return input ?? "USD";
}

function sanitizeDescription(input: string): string {
  const value = input.trim();
  return value.length > 0 ? value : "Imported bank transaction";
}

function mapToTransactionData(input: {
  tx: BankRemoteTransaction;
  fallbackAccountLabel: string | null;
}) {
  const { tx, fallbackAccountLabel } = input;
  const type = inferTransactionType(tx, tx.amount);
  const parsedDate = parseBankTransactionDate(tx.date);

  return {
    amount: Math.abs(tx.amount),
    currency: normalizeCurrency(tx.currency),
    type,
    category:
      tx.category?.trim() ||
      (type === "INCOME" ? "Bank Income" : "Bank Expense"),
    sourceAccount:
      tx.accountName?.trim() || fallbackAccountLabel || "Linked Bank",
    destinationAccount: null,
    note: sanitizeDescription(tx.description),
    date: parsedDate,
  };
}

function createGenericReadonlyClient(baseUrl: string): BankClient {
  const endpoint = process.env.BANK_API_TRANSACTIONS_PATH ?? "/transactions";

  return {
    async fetchTransactions({ accessToken, cursor, startDate, endDate }) {
      const url = new URL(endpoint, baseUrl);

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }
      if (startDate) {
        url.searchParams.set("startDate", startDate);
      }
      if (endDate) {
        url.searchParams.set("endDate", endDate);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Failed to fetch bank transactions (${response.status}): ${body.slice(
            0,
            240
          )}`
        );
      }

      const json = (await response.json()) as Partial<BankFetchResponse>;

      if (!Array.isArray(json.transactions)) {
        throw new Error("Invalid bank API response: transactions array is required");
      }

      return {
        transactions: json.transactions,
        nextCursor: json.nextCursor ?? null,
      };
    },
  };
}

function getReadonlyClient(provider: BankIntegrationProvider): BankClient {
  switch (provider) {
    case "GENERIC": {
      const baseUrl = process.env.BANK_API_BASE_URL;
      if (!baseUrl) {
        throw new Error("BANK_API_BASE_URL is not configured");
      }
      return createGenericReadonlyClient(baseUrl);
    }
    default:
      throw new Error(`Unsupported bank provider: ${provider}`);
  }
}

export async function runBankTransactionsSync(params: {
  userId: string;
  connection: BankConnection;
  accessToken: string;
  startDate?: string;
  endDate?: string;
}) {
  const { userId, connection, accessToken, startDate, endDate } = params;

  assertReadOnlyScope(connection.tokenScope);
  assertBankIntegrationAccountAllowed({
    accountLabel: connection.accountLabel,
    providerAccountId: connection.providerAccountId,
  });

  const client = getReadonlyClient(connection.provider);
  const fetchResult = await client.fetchTransactions({
    accessToken,
    cursor: connection.lastCursor,
    startDate,
    endDate,
  });

  const imported = await prisma.$transaction(async (tx) => {
    let insertedCount = 0;

    for (const remoteTx of fetchResult.transactions) {
      const transactionDate = parseBankTransactionDate(remoteTx.date);
      if (Number.isNaN(transactionDate.getTime())) {
        continue;
      }

      const existingImport = await tx.importedBankTransaction.findUnique({
        where: {
          connectionId_externalTransactionId: {
            connectionId: connection.id,
            externalTransactionId: remoteTx.id,
          },
        },
        select: { id: true },
      });

      if (existingImport) {
        continue;
      }

      const mapped = mapToTransactionData({
        tx: remoteTx,
        fallbackAccountLabel: connection.accountLabel,
      });

      const createdTransaction = await tx.transaction.create({
        data: {
          ...mapped,
          userId,
        },
      });

      await tx.importedBankTransaction.create({
        data: {
          userId,
          connectionId: connection.id,
          externalTransactionId: remoteTx.id,
          transactionId: createdTransaction.id,
          amount: remoteTx.amount,
          currency: mapped.currency,
          occurredAt: mapped.date,
          description: mapped.note,
          externalRaw: JSON.stringify(remoteTx),
        },
      });

      insertedCount += 1;
    }

    await tx.bankConnection.update({
      where: { id: connection.id },
      data: {
        lastCursor: fetchResult.nextCursor ?? connection.lastCursor,
        lastSyncedAt: new Date(),
      },
    });

    return insertedCount;
  });

  return {
    fetched: fetchResult.transactions.length,
    imported,
    nextCursor: fetchResult.nextCursor ?? connection.lastCursor,
  };
}

export function getBankProviderFromInput(provider: string): BankIntegrationProvider {
  const normalized = provider.trim().toUpperCase();

  if (normalized === "GENERIC") {
    return "GENERIC";
  }

  throw new Error("Unsupported bank provider. Supported values: GENERIC");
}

export const bankConnectionSelect = {
  id: true,
  provider: true,
  providerAccountId: true,
  accountLabel: true,
  tokenScope: true,
  tokenExpiresAt: true,
  lastCursor: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BankConnectionSelect;
