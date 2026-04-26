import { extractEntities } from "./entities";
import type { PiiDetectionResult } from "./types";

export async function callGlinerPii(
  endpoint: string,
  apiKey: string,
  text: string,
  labels: string[],
  threshold: number
): Promise<PiiDetectionResult> {
  const payloads = [
    {
      inputs: text,
      parameters: {
        labels,
        threshold,
      },
    },
    {
      inputs: {
        text,
        labels,
        threshold,
      },
    },
  ];

  let lastErrorText = "Unknown GLiNER response.";

  for (const payload of payloads) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastErrorText = errorText || response.statusText;

      if (response.status >= 500 || response.status === 429) {
        return {
          entities: [],
          warning: "GLiNER PII is temporarily unavailable. OCR parsing continued.",
        };
      }

      continue;
    }

    const data = (await response.json().catch(() => null)) as unknown;
    const entities = extractEntities(data, text);
    return { entities };
  }

  console.error("GLiNER PII request failed", lastErrorText);
  return {
    entities: [],
    warning: "GLiNER PII request failed. OCR parsing continued without redaction.",
  };
}
