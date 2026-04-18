import type { ChatMessage } from "./ai-assistant-widget-types";

export const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I am your TrackIt AI assistant. Ask me about budgets, transactions, recurring entries, or shared expenses.",
};

export const assistantQuickPrompts = [
  "Analyze my dashboard",
  "What is my top spending category?",
  "Any budgets near limit?",
] as const;

export function renderFormattedText(content: string) {
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part, partIndex) => {
          const isBold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
          if (!isBold) {
            return <span key={`${lineIndex}-${partIndex}`}>{part}</span>;
          }

          return (
            <strong key={`${lineIndex}-${partIndex}`} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </>
    );
  });
}
