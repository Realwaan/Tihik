"use client";

import { Bot, Loader2, Mic, MicOff, Send, Sparkles, X } from "lucide-react";

import {
  assistantQuickPrompts,
  renderFormattedText,
} from "./ai-assistant-widget-helpers";
import { useAiAssistantWidget } from "./use-ai-assistant-widget";

export function AiAssistantWidget() {
  const {
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
  } = useAiAssistantWidget();

  return (
    <>
      {open ? (
        <section
          className="fixed bottom-24 right-4 z-40 flex h-[70vh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">TrackIt AI</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Smart finance assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {assistantQuickPrompts.map((quickPrompt) => (
                <button
                  key={quickPrompt}
                  type="button"
                  onClick={() => setInput(quickPrompt)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {quickPrompt}
                </button>
              ))}
            </div>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {message.role === "user" ? "You" : "TrackIt AI"}
                </p>
                <p className="leading-relaxed">{renderFormattedText(message.content)}</p>
              </article>
            ))}
            {sending ? (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask for analysis (example: analyze my dashboard this month)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {dictationSupported ? (
                <button
                  type="button"
                  onClick={toggleDictation}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    dictating
                      ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                  aria-label={dictating ? "Stop voice dictation" : "Start voice dictation"}
                >
                  {dictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              ) : null}
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        style={{ marginBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-label="Open AI assistant"
      >
        <Bot className="h-6 w-6" />
      </button>
    </>
  );
}
