import type { AssistantHistoryItem } from "./types";

const GREETING_PATTERN =
  /^(?:hi|hello|hey|yo|good\s+(?:morning|afternoon|evening))\b/i;
const SHORT_FOLLOW_UP_PATTERN =
  /^(?:why|how|what\s+about|and|also|then|next|ok|okay|yes|no|continue|explain|details?)\b/i;
const TRANSACTION_ACTION_PATTERN =
  /\b(?:add|record|log|create|spent|spend|pay|paid|receive|received|earn|earned|transfer)\b/i;
const HAS_AMOUNT_OR_CURRENCY_PATTERN =
  /(?:₱|\$|€|£|¥|\b(?:usd|eur|gbp|jpy|cad|aud|php)\b|\b\d+(?:\.\d{1,2})?\b)/i;

const IN_SCOPE_KEYWORDS = [
  "trackit",
  "dashboard",
  "budget",
  "budgets",
  "transaction",
  "transactions",
  "expense",
  "expenses",
  "income",
  "transfer",
  "recurring",
  "installment",
  "collaboration",
  "household",
  "settlement",
  "wallet",
  "bank",
  "account",
  "accounts",
  "category",
  "categories",
  "cash",
  "card",
  "credit",
  "debit",
  "receipt",
  "scan",
  "ocr",
  "profile",
  "currency",
  "notification",
  "notifications",
  "sync",
  "assistant",
  "sign in",
  "signin",
  "sign up",
  "signup",
  "login",
  "log in",
  "password",
  "email verification",
  "shared expense",
  "bank connection",
  "bank integration",
];

function containsInScopeKeyword(text: string): boolean {
  return IN_SCOPE_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function isAssistantRequestInScope(params: {
  message: string;
  history?: AssistantHistoryItem[];
}): boolean {
  const message = params.message.trim();
  if (!message) {
    return true;
  }

  const normalized = message.toLowerCase();
  const history = params.history ?? [];
  const tokenCount = normalized.split(/\s+/).filter(Boolean).length;

  if (GREETING_PATTERN.test(normalized) && tokenCount <= 6) {
    return true;
  }

  if (containsInScopeKeyword(normalized)) {
    return true;
  }

  if (
    TRANSACTION_ACTION_PATTERN.test(normalized) &&
    HAS_AMOUNT_OR_CURRENCY_PATTERN.test(normalized)
  ) {
    return true;
  }

  if (history.length > 0 && tokenCount <= 8 && SHORT_FOLLOW_UP_PATTERN.test(normalized)) {
    return true;
  }

  return false;
}

export function buildOutOfScopeReply(): string {
  return [
    "Snapshot",
    "I can only help with TrackIt website features and your finance tasks inside this app.",
    "",
    "Insights",
    "For safety, I avoid unrelated requests and external topics.",
    "",
    "Actions",
    "1. Ask about TrackIt pages: dashboard, transactions, budgets, recurring, bank, collaboration.",
    "2. Ask me to add/analyze transactions or explain what changed in your data.",
    "3. Rephrase your question with TrackIt context so I can act safely.",
  ].join("\n");
}