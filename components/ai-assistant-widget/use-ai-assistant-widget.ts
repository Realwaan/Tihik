import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { initialMessage } from "./ai-assistant-widget-helpers";
import { createSpeechRecognition, type SpeechRecognitionLike } from "./ai-assistant-dictation";
import { buildRecentHistory, createMessageId } from "./ai-assistant-messages";
import {
  buildHistoryStorageKey,
  compactMessagesForStorage,
  normalizeStoredMessages,
} from "./ai-assistant-storage";
import type { AssistantCurrency, ChatMessage } from "./ai-assistant-widget-types";

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
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
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
    const recognition = createSpeechRecognition(setInput, setDictating);
    if (!recognition) {
      setDictationSupported(false);
      return;
    }

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
    () => buildRecentHistory(messages),
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
