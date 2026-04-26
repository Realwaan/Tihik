import type { ChatMessage } from "./ai-assistant-widget-types";

export function createMessageId(role: ChatMessage["role"], variant: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `${Date.now()}-${role}-${variant}-${random}`;
}

export function buildRecentHistory(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.id !== "welcome")
    .slice(-4)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 500),
    }));
}
