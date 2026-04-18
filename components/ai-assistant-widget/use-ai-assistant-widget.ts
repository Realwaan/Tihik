import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { initialMessage } from "./ai-assistant-widget-helpers";
import type { AssistantCurrency, ChatMessage } from "./ai-assistant-widget-types";

export function useAiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [preferredCurrency, setPreferredCurrency] = useState<AssistantCurrency>("USD");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return;
        const json = await response.json();
        const currency = (json.user?.preferredCurrency ?? "USD") as AssistantCurrency;
        setPreferredCurrency(currency);
      } catch {
        // ignore profile fetch errors for chat boot
      }
    }

    loadPreference();
  }, []);

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
      id: `${Date.now()}-user`,
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
            id: `${Date.now()}-assistant-error`,
            role: "assistant",
            content: errorMessage,
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: json.data.reply,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-fallback`,
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
  };
}
