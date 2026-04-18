export type AssistantCurrency =
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CAD"
  | "AUD"
  | "PHP";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};
