import type {
  AssistantErrorPayload,
  AssistantHistoryItem,
  AssistantSuccessPayload,
} from "./types";

type ProviderResult = AssistantSuccessPayload | AssistantErrorPayload;

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
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

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanAssistantText(input: string): string {
  let text = input;

  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  text = text.replace(/^#{1,6}\s*/gm, "");
  text = text.replace(/\*\*|__|`|~~/g, "");
  text = text.replace(/[•●◦▪]/g, "-");
  text = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ");

  // Keep readable text and common currency symbols while removing noisy control/special chars.
  text = text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A3\u00A5\u20AC\u20B1]/g, "");

  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function getChatCompletionReply(data: OpenAIChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();
  }

  return "";
}

export async function callNvidiaNemotron(
  apiKey: string,
  systemInstruction: string,
  history: AssistantHistoryItem[],
  message: string
): Promise<ProviderResult> {
  const model =
    process.env.NVIDIA_MODEL?.trim() || "nvidia/nemotron-3-super-120b-a12b";
  const baseUrl =
    process.env.NVIDIA_BASE_URL?.trim() || "https://integrate.api.nvidia.com/v1";
  const temperature = getEnvNumber("NVIDIA_TEMPERATURE", 1);
  const topP = getEnvNumber("NVIDIA_TOP_P", 0.95);
  const maxTokens = getEnvNumber("NVIDIA_MAX_TOKENS", 16384);
  const reasoningBudget = getEnvNumber("NVIDIA_REASONING_BUDGET", 16384);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemInstruction },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: message },
      ],
      stream: false,
      extra_body: {
        chat_template_kwargs: {
          enable_thinking: true,
        },
        reasoning_budget: reasoningBudget,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("NVIDIA API error", errorText);

    if (response.status === 401 || response.status === 403) {
      return {
        error: "NVIDIA API key is invalid or blocked. Check NVIDIA_API_KEY.",
        status: 502,
      };
    }

    if (response.status === 429) {
      return {
        error: "NVIDIA quota/rate limit reached. Check usage and billing.",
        status: 502,
      };
    }

    return {
      error: "Assistant service is unavailable right now.",
      status: 502,
    };
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  const reply = getChatCompletionReply(data);

  if (!reply) {
    return {
      error: "Assistant returned an empty response.",
      status: 502,
    };
  }

  return { data: { reply: cleanAssistantText(reply) } };
}

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
  const reply = getChatCompletionReply(data);

  if (!reply) {
    return {
      error: "Assistant returned an empty response.",
      status: 502,
    };
  }

  return { data: { reply: cleanAssistantText(reply) } };
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

  return { data: { reply: cleanAssistantText(reply) } };
}
