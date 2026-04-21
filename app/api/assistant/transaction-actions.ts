import type { TransactionType } from "@prisma/client";

import { suggestCategoryFromNote } from "@/lib/auto-category";
import { formatCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { transactionCreateSchema } from "@/lib/validations/transaction";

import type { SupportedCurrency } from "./types";

type ParsedCommand = {
  type: TransactionType;
  amount: number;
  currency: SupportedCurrency;
  category: string;
  sourceAccount?: string;
  destinationAccount?: string;
  note?: string;
  date: Date;
};

type ParseResult =
  | { kind: "not-command" }
  | { kind: "invalid-command"; reason: string }
  | { kind: "parsed"; commands: ParsedCommand[] };

export type AssistantActionResult = {
  handled: boolean;
  reply?: string;
};

const COMMAND_PREFIX =
  /^(?:hi\s+trackit\s*,?\s*)?(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:add|record|log|create)\b/i;

const NATURAL_TRANSACTION_PREFIX =
  /^(?:i\s+)?(?:just\s+)?(?:spent|pay|paid|buy|bought|received|receive|earned|got\s+paid|transfer|transferred|send|sent|move|moved)\b/i;

const QUESTION_LIKE_PATTERN =
  /\?|^(?:what|why|how|when|where|which|did|do|does|is|are|can|could|would|should|will)\b/i;

const NON_TRANSACTION_TOPICS =
  /\b(?:budget|limit|recurring|installment|goal|forecast|summary|report|chart|graph)\b/i;

const TRANSACTION_SIGNAL =
  /\b(?:expense|income|transfer|spend|spent|buy|bought|pay|paid|receive|received|salary|cash|wallet|card)\b|[₱$€£¥]|\b(?:USD|EUR|GBP|JPY|CAD|AUD|PHP)\b/i;

const MAX_MULTI_ENTRY_COMMANDS = 8;

type AmountMatch = {
  amount: number;
  start: number;
  end: number;
};

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function toTitleCase(input: string): string {
  return normalizeWhitespace(input)
    .split(" ")
    .map((word) => {
      if (!word) {
        return "";
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function parseType(message: string): TransactionType {
  if (/\b(?:transfer|transferred|move|moved|send|sent)\b/i.test(message)) {
    return "TRANSFER";
  }

  if (
    /\b(?:income|salary|earn|earned|received|receive|paycheck|got\s+paid|deposit|deposited)\b/i.test(
      message
    )
  ) {
    return "INCOME";
  }

  return "EXPENSE";
}

function parseCurrency(
  message: string,
  fallbackCurrency: SupportedCurrency
): SupportedCurrency {
  const byCode = message.toUpperCase();

  const codeMatch = byCode.match(/\b(USD|EUR|GBP|JPY|CAD|AUD|PHP)\b/);
  if (codeMatch) {
    return codeMatch[1] as SupportedCurrency;
  }

  if (message.includes("₱")) {
    return "PHP";
  }

  if (message.includes("€")) {
    return "EUR";
  }

  if (message.includes("£")) {
    return "GBP";
  }

  if (message.includes("¥")) {
    return "JPY";
  }

  if (message.includes("$")) {
    return fallbackCurrency;
  }

  return fallbackCurrency;
}

function parseAmountMatches(message: string): AmountMatch[] {
  const matches = message.matchAll(
    /(?:₱|\$|€|£|¥|\b(?:USD|EUR|GBP|JPY|CAD|AUD|PHP)\b)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/gi
  );

  const parsedMatches: AmountMatch[] = [];

  for (const match of matches) {
    const raw = match[1];
    const full = match[0] ?? "";
    const fullIndex = match.index ?? -1;
    if (!raw || fullIndex < 0) {
      continue;
    }

    const rawIndexInFull = full.lastIndexOf(raw);
    const start = fullIndex + (rawIndexInFull >= 0 ? rawIndexInFull : 0);
    const end = start + raw.length;

    // Ignore numbers that are likely part of YYYY-MM-DD patterns.
    const previousChar = message[start - 1] ?? "";
    const nextChar = message[end] ?? "";
    if (previousChar === "-" || nextChar === "-") {
      continue;
    }

    const parsed = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000_000) {
      continue;
    }

    parsedMatches.push({ amount: parsed, start, end });
  }

  return parsedMatches;
}

function parseAmount(message: string): number | null {
  return parseAmountMatches(message)[0]?.amount ?? null;
}

function trimCategoryTail(value: string): string {
  const clean = value
    .replace(/[.,!?]+$/g, "")
    .replace(/\b(?:and|then)\s*$/i, "")
    .replace(/\b(?:today|yesterday|now|this\s+morning|this\s+afternoon|tonight)\b.*$/i, "")
    .replace(/\b(?:from|to|using|via|with|on|at|note)\b.*$/i, "")
    .trim();

  return clean;
}

function extractCategoryCandidateFromAmountContext(message: string): string | null {
  const amountContextMatch = message.match(
    /(?:₱|\$|€|£|¥|\b(?:USD|EUR|GBP|JPY|CAD|AUD|PHP)\b)?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s*(?:for|on|under|as|category(?:\s+is)?)?\s*([a-z][a-z0-9 &'/-]{1,50})/i
  );

  if (!amountContextMatch) {
    return null;
  }

  const candidate = trimCategoryTail(amountContextMatch[1] ?? "");
  return candidate || null;
}

function parseCategory(message: string, type: TransactionType): string {
  if (type === "TRANSFER") {
    return "Transfer";
  }

  const explicitMatch = message.match(
    /\b(?:for|on|under|category(?:\s+is)?|as\s+category)\s+([a-z][a-z0-9 &'/-]{1,50})/i
  );

  const cleanedExplicit = explicitMatch ? trimCategoryTail(explicitMatch[1]) : "";
  if (cleanedExplicit) {
    return toTitleCase(cleanedExplicit);
  }

  const amountCandidate = extractCategoryCandidateFromAmountContext(message);
  if (amountCandidate) {
    const inferredFromAmount = suggestCategoryFromNote(amountCandidate, type, []);
    if (inferredFromAmount) {
      return inferredFromAmount;
    }

    return toTitleCase(amountCandidate);
  }

  const inferred = suggestCategoryFromNote(message, type, []);
  if (inferred) {
    return inferred;
  }

  return type === "INCOME" ? "Other Income" : "Miscellaneous";
}

function parseSourceAccount(message: string): string | undefined {
  if (/\bgcash\b/i.test(message)) {
    return "GCash";
  }

  if (/\bcash\b/i.test(message)) {
    return "Cash";
  }

  if (/\bcredit\s*card\b|\bcard\b/i.test(message)) {
    return "Credit Card";
  }

  if (/\bwallet\b/i.test(message)) {
    return "Wallet";
  }

  const fromMatch = message.match(/\bfrom\s+([a-z][a-z0-9 &'/-]{1,50})/i);
  const extracted = fromMatch ? trimCategoryTail(fromMatch[1]) : "";
  return extracted ? toTitleCase(extracted) : undefined;
}

function parseDestinationAccount(message: string): string | undefined {
  const toMatch = message.match(/\bto\s+([a-z][a-z0-9 &'/-]{1,50})/i);
  const extracted = toMatch ? trimCategoryTail(toMatch[1]) : "";
  return extracted ? toTitleCase(extracted) : undefined;
}

function parseNote(message: string): string | undefined {
  const noteMatch = message.match(/\bnote\s*[:=-]\s*(.{1,200})$/i);
  if (!noteMatch) {
    return undefined;
  }

  const normalized = normalizeWhitespace(noteMatch[1]);
  return normalized || undefined;
}

function parseDate(message: string): Date {
  const isoMatch = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    const parsed = new Date(isoMatch[1]);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const now = new Date();
  if (/\byesterday\b/i.test(message)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  }

  return now;
}

function parseTransactionCommand(
  message: string,
  fallbackCurrency: SupportedCurrency
): ParseResult {
  const trimmed = normalizeWhitespace(message);
  const hasExplicitCommand = COMMAND_PREFIX.test(trimmed);
  const hasNaturalTransaction = NATURAL_TRANSACTION_PREFIX.test(trimmed);

  if (!hasExplicitCommand && !hasNaturalTransaction) {
    return { kind: "not-command" };
  }

  if (!hasExplicitCommand && QUESTION_LIKE_PATTERN.test(trimmed)) {
    return { kind: "not-command" };
  }

  if (!hasNaturalTransaction && NON_TRANSACTION_TOPICS.test(trimmed)) {
    return { kind: "not-command" };
  }

  if (!TRANSACTION_SIGNAL.test(trimmed)) {
    return { kind: "not-command" };
  }

  const type = parseType(trimmed);
  const amountMatches = parseAmountMatches(trimmed);
  if (amountMatches.length === 0) {
    return {
      kind: "invalid-command",
      reason: "I need a valid amount greater than 0.",
    };
  }

  if (amountMatches.length > MAX_MULTI_ENTRY_COMMANDS) {
    return {
      kind: "invalid-command",
      reason: `Please send at most ${MAX_MULTI_ENTRY_COMMANDS} entries in one request.`,
    };
  }

  const currency = parseCurrency(trimmed, fallbackCurrency);
  const sourceAccount = parseSourceAccount(trimmed);
  const destinationAccount = parseDestinationAccount(trimmed);

  if (type === "TRANSFER") {
    if (!sourceAccount || !destinationAccount) {
      return {
        kind: "invalid-command",
        reason:
          "For transfers, include both source and destination accounts (example: add transfer 100 from Cash to Savings).",
      };
    }

    if (amountMatches.length > 1) {
      return {
        kind: "invalid-command",
        reason: "For transfers, send one transfer per message.",
      };
    }
  }

  const multiEntry = type !== "TRANSFER" && amountMatches.length > 1;
  const note = parseNote(trimmed);
  const date = parseDate(trimmed);

  const commands: ParsedCommand[] = multiEntry
    ? amountMatches.map((amountMatch, index) => {
        const nextStart = amountMatches[index + 1]?.start ?? trimmed.length;
        const segment = trimmed.slice(amountMatch.start, nextStart);

        return {
          type,
          amount: amountMatch.amount,
          currency: parseCurrency(segment, currency),
          category: parseCategory(segment, type),
          sourceAccount,
          destinationAccount,
          note,
          date,
        };
      })
    : [
        {
          type,
          amount: parseAmount(trimmed) ?? amountMatches[0].amount,
          currency,
          category: parseCategory(trimmed, type),
          sourceAccount,
          destinationAccount,
          note,
          date,
        },
      ];

  return {
    kind: "parsed",
    commands,
  };
}

function buildCommandErrorReply(reason: string): string {
  return [
    "Snapshot",
    "I can add that transaction, but I need a bit more detail.",
    "",
    "Insights",
    reason,
    "",
    "Actions",
    "1. Say: add expense 15 for Food or I spent 15 on food",
    "2. Multi-entry is supported: I spent 15 on food and 10 on fare",
    "3. Comma style works too: I spent 15 food, 10 fare, 30 groceries",
    "4. Optional: include account (example: from Cash)",
    "5. Optional: include date as YYYY-MM-DD",
  ].join("\n");
}

function buildSuccessReply(transaction: {
  type: TransactionType;
  amount: number;
  currency: SupportedCurrency;
  category: string;
  sourceAccount: string | null;
  destinationAccount: string | null;
  date: Date;
}): string {
  const amountLabel = formatCurrency(transaction.amount, transaction.currency);
  const typeLabel = transaction.type.toLowerCase();

  return [
    "Snapshot",
    `Saved ${typeLabel} transaction: ${amountLabel}.`,
    `Category: ${transaction.category}.`,
    `Date: ${transaction.date.toISOString().slice(0, 10)}.`,
    transaction.sourceAccount ? `Source account: ${transaction.sourceAccount}.` : "",
    transaction.destinationAccount
      ? `Destination account: ${transaction.destinationAccount}.`
      : "",
    "",
    "Insights",
    "This entry was actually written to your transactions data.",
    "",
    "Actions",
    "1. Open Transactions to verify the new row.",
    "2. Ask me to analyze your dashboard to include this update.",
    "3. Tell me if you want another transaction added.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMultiSuccessReply(
  transactions: Array<{
    type: TransactionType;
    amount: number;
    currency: SupportedCurrency;
    category: string;
    date: Date;
  }>
): string {
  const sameCurrency = transactions.every(
    (transaction) => transaction.currency === transactions[0].currency
  );

  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  const totalLabel = sameCurrency
    ? formatCurrency(totalAmount, transactions[0].currency)
    : `${totalAmount.toFixed(2)} (mixed currencies)`;

  const lines = transactions.map((transaction, index) => {
    const amountLabel = formatCurrency(transaction.amount, transaction.currency);
    const dateLabel = transaction.date.toISOString().slice(0, 10);
    return `${index + 1}. ${amountLabel} - ${transaction.category} (${dateLabel})`;
  });

  return [
    "Snapshot",
    `Saved ${transactions.length} transactions totaling ${totalLabel}.`,
    ...lines,
    "",
    "Insights",
    "All listed entries were actually written to your transactions data in one request.",
    "",
    "Actions",
    "1. Open Transactions to verify all new rows.",
    "2. Ask me to analyze your dashboard with the latest entries.",
    "3. Send another multi-entry message if you want to add more quickly.",
  ].join("\n");
}

export async function tryExecuteTransactionCommand(params: {
  userId?: string;
  message: string;
  preferredCurrency: SupportedCurrency;
}): Promise<AssistantActionResult> {
  const parsed = parseTransactionCommand(params.message, params.preferredCurrency);
  if (parsed.kind === "not-command") {
    return { handled: false };
  }

  if (!params.userId) {
    return {
      handled: true,
      reply: [
        "Snapshot",
        "I can add transactions only when you are signed in.",
        "",
        "Insights",
        "Your request looked like a create transaction command, but no active session was found.",
        "",
        "Actions",
        "1. Sign in",
        "2. Repeat your add transaction request",
        "3. Ask me to analyze your dashboard after it is saved",
      ].join("\n"),
    };
  }

  const userId = params.userId;

  if (parsed.kind === "invalid-command") {
    return {
      handled: true,
      reply: buildCommandErrorReply(parsed.reason),
    };
  }

  const normalizedPayloads: Array<{
    amount: number;
    currency: SupportedCurrency;
    type: TransactionType;
    category: string;
    sourceAccount: string | null;
    destinationAccount: string | null;
    note: string | null;
    date: Date;
  }> = [];

  for (const [index, command] of parsed.commands.entries()) {
    const validated = transactionCreateSchema.safeParse({
      amount: command.amount,
      currency: command.currency,
      type: command.type,
      category: command.type === "TRANSFER" ? "Transfer" : command.category,
      sourceAccount: command.sourceAccount ?? undefined,
      destinationAccount:
        command.type === "TRANSFER"
          ? command.destinationAccount ?? undefined
          : undefined,
      note: command.note ?? undefined,
      date: command.date,
    });

    if (!validated.success) {
      return {
        handled: true,
        reply: buildCommandErrorReply(
          `Entry ${index + 1}: ${
            validated.error.issues[0]?.message ??
            "The transaction details were incomplete or invalid."
          }`
        ),
      };
    }

    normalizedPayloads.push({
      ...validated.data,
      category:
        validated.data.type === "TRANSFER"
          ? "Transfer"
          : (validated.data.category?.trim() ?? ""),
      sourceAccount: validated.data.sourceAccount?.trim() || null,
      destinationAccount:
        validated.data.type === "TRANSFER"
          ? validated.data.destinationAccount?.trim() || null
          : null,
      note: validated.data.note?.trim() || null,
    });
  }

  const createdTransactions = await prisma.$transaction(
    normalizedPayloads.map((payload) =>
      prisma.transaction.create({
        data: {
          ...payload,
          userId,
        },
      })
    )
  );

  if (createdTransactions.length === 1) {
    const transaction = createdTransactions[0];
    return {
      handled: true,
      reply: buildSuccessReply({
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        sourceAccount: transaction.sourceAccount,
        destinationAccount: transaction.destinationAccount,
        date: transaction.date,
      }),
    };
  }

  return {
    handled: true,
    reply: buildMultiSuccessReply(
      createdTransactions.map((transaction) => ({
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        date: transaction.date,
      }))
    ),
  };
}