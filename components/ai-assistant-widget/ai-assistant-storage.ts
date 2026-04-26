import { initialMessage } from "./ai-assistant-widget-helpers";
import type { ChatMessage } from "./ai-assistant-widget-types";

const AI_HISTORY_STORAGE_PREFIX = "trackit-ai-history-v1";
const MAX_STORED_MESSAGES = 60;
const MAX_STORED_CONTENT_LENGTH = 4000;

export function buildHistoryStorageKey(userId: string | null): string {
  return `${AI_HISTORY_STORAGE_PREFIX}:${userId?.trim() || "guest"}`;
}

export function normalizeStoredMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return [initialMessage];
  }

  const restored = raw
    .map((item, index): ChatMessage | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const role =
        record.role === "assistant" || record.role === "user" ? record.role : null;
      const content =
        typeof record.content === "string"
          ? record.content.trim().slice(0, MAX_STORED_CONTENT_LENGTH)
          : "";

      if (!role || !content) {
        return null;
      }

      const id =
        typeof record.id === "string" && record.id.trim().length > 0
          ? record.id
          : `restored-${role}-${index}`;

      return {
        id,
        role,
        content,
      };
    })
    .filter((item): item is ChatMessage => Boolean(item));

  if (restored.length === 0) {
    return [initialMessage];
  }

  return restored.slice(-MAX_STORED_MESSAGES);
}

export function compactMessagesForStorage(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_STORED_MESSAGES).map((message) => ({
    ...message,
    content: message.content.slice(0, MAX_STORED_CONTENT_LENGTH),
  }));
}
