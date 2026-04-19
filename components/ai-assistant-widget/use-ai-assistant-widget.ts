import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { initialMessage } from "./ai-assistant-widget-helpers";
import type { AssistantCurrency, ChatMessage } from "./ai-assistant-widget-types";

const AI_HISTORY_STORAGE_PREFIX = "trackit-ai-history-v1";
const MAX_STORED_MESSAGES = 60;
const MAX_STORED_CONTENT_LENGTH = 4000;

function buildHistoryStorageKey(userId: string | null): string {
  return `${AI_HISTORY_STORAGE_PREFIX}:${userId?.trim() || "guest"}`;
}

function normalizeStoredMessages(raw: unknown): ChatMessage[] {
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

function compactMessagesForStorage(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_STORED_MESSAGES).map((message) => ({
    ...message,
    content: message.content.slice(0, MAX_STORED_CONTENT_LENGTH),
  }));
}

function createMessageId(role: ChatMessage["role"], variant: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);

  return `${Date.now()}-${role}-${variant}-${random}`;
}

export function useAiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [preferredCurrency, setPreferredCurrency] = useState<AssistantCurrency>("USD");
  const [historyStorageKey, setHistoryStorageKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const historyHydratedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    async function loadPreference() {
      let resolvedUserId: string | null = null;

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const json = await response.json();
          const currency = (json.user?.preferredCurrency ?? "USD") as AssistantCurrency;
          setPreferredCurrency(currency);
          resolvedUserId =
            typeof json.user?.id === "string" ? json.user.id : null;
        }
      } catch {
        // ignore profile fetch errors for chat boot
      } finally {
        setHistoryStorageKey(buildHistoryStorageKey(resolvedUserId));
      }
    }

    loadPreference();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !historyStorageKey) {
      return;
    }

    historyHydratedRef.current = false;

    try {
      const raw = window.localStorage.getItem(historyStorageKey);
      if (!raw) {
        setMessages([initialMessage]);
      } else {
        const parsed = JSON.parse(raw) as unknown;
        setMessages(normalizeStoredMessages(parsed));
      }
    } catch {
      setMessages([initialMessage]);
    } finally {
      historyHydratedRef.current = true;
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !historyStorageKey ||
      !historyHydratedRef.current
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        historyStorageKey,
        JSON.stringify(compactMessagesForStorage(messages))
      );
    } catch {
      // ignore storage write errors
    }
  }, [messages, historyStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setDictationSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setInput((current) => transcript);
      }
    };

    recognition.onend = () => setDictating(false);
    recognition.onerror = () => setDictating(false);

    speechRecognitionRef.current = recognition;
    setDictationSupported(true);

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore stop errors
      }
      speechRecognitionRef.current = null;
    };
  }, []);

  const recentHistory = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .slice(-4)
        .map((message) => ({
          role: message.role,
          content: message.content.slice(0, 500),
        })),
    [messages]
  );

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId("user", "input"),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          preferredCurrency,
          history: recentHistory,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.data?.reply) {
        const errorMessage = json?.error ?? "I could not answer that right now.";
        setMessages((current) => [
          ...current,
          {
            id: createMessageId("assistant", "error"),
            role: "assistant",
            content: errorMessage,
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId("assistant", "reply"),
          role: "assistant",
          content: json.data.reply,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId("assistant", "fallback"),
          role: "assistant",
          content: "Network issue detected. Please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function toggleDictation() {
    const recognition = speechRecognitionRef.current;
    if (!recognition) {
      return;
    }

    if (dictating) {
      try {
        recognition.stop();
      } finally {
        setDictating(false);
      }
      return;
    }

    try {
      recognition.start();
      setDictating(true);
    } catch {
      setDictating(false);
    }
  }

  function clearHistory() {
    setMessages([initialMessage]);

    if (typeof window === "undefined" || !historyStorageKey) {
      return;
    }

    try {
      window.localStorage.removeItem(historyStorageKey);
    } catch {
      // ignore storage delete errors
    }
  }

  return {
    open,
    setOpen,
    input,
    setInput,
    sending,
    messages,
    dictationSupported,
    dictating,
    scrollRef,
    sendMessage,
    toggleDictation,
    clearHistory,
  };
}
