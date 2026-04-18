export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "PHP",
] as const;

export type PreferredCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type AssistantHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantRequest = {
  message: string;
  preferredCurrency?: PreferredCurrency;
  history?: AssistantHistoryItem[];
};

export type AssistantSuccessPayload = {
  data: { reply: string };
};

export type AssistantErrorPayload = {
  error: string;
  status: number;
};
