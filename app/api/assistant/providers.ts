import type {
  AssistantErrorPayload,
  AssistantHistoryItem,
  AssistantSuccessPayload,
} from "./types";

type ProviderResult = AssistantSuccessPayload | AssistantErrorPayload;

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function callOpenAI(
  apiKey: string,
  systemInstruction: string,
  history: AssistantHistoryItem[],
  message: string
): Promise<ProviderResult> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: systemInstruction },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error", errorText);

    if (response.status === 401 || response.status === 403) {
      return {
        error: "OpenAI API key is invalid or blocked. Check OPENAI_API_KEY.",
        status: 502,
      };
    }

    if (response.status === 429) {
      return {
        error: "OpenAI quota/rate limit reached. Check usage and billing.",
        status: 502,
      };
    }

    return {
      error: "Assistant service is unavailable right now.",
      status: 502,
    };
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  const reply = data.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || !reply.trim()) {
    return {
      error: "Assistant returned an empty response.",
      status: 502,
    };
  }

  return { data: { reply: reply.trim() } };
}

export async function callGemini(
  apiKey: string,
  systemInstruction: string,
  history: AssistantHistoryItem[],
  message: string
): Promise<ProviderResult> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          ...history.map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }],
          })),
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error", errorText);

    if (response.status === 401 || response.status === 403) {
      return {
        error: "Gemini API key is invalid or blocked. Check GEMINI_API_KEY.",
        status: 502,
      };
    }

    if (response.status === 429) {
      return {
        error: "Gemini quota/rate limit reached. Check usage and billing.",
        status: 502,
      };
    }

    return {
      error: "Assistant service is unavailable right now.",
      status: 502,
    };
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const parts = data.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts
        .map((part) => part.text ?? "")
        .join("\n")
        .trim()
    : "";

  if (!reply) {
    return {
      error: "Assistant returned an empty response.",
      status: 502,
    };
  }

  return { data: { reply } };
}
