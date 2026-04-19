import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(25000),
});

type PiiEntity = {
  start: number;
  end: number;
  label: string;
  text: string;
  score: number | null;
};

type ParsedPiiEntity = {
  label: string;
  text: string;
  score: number | null;
};

const DEFAULT_GLINER_ENDPOINT =
  "https://api-inference.huggingface.co/models/knowledgator/gliner-pii-small-v1.0";

const DEFAULT_PII_LABELS = [
  "name",
  "email address",
  "phone number",
  "account number",
  "bank account",
  "routing number",
  "credit card",
  "credit card expiration",
  "cvv",
  "ssn",
  "passport number",
  "driver license",
  "location address",
  "location zip",
] as const;

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getConfiguredLabels(): string[] {
  const configured = process.env.GLINER_PII_LABELS
    ?.split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  return configured && configured.length > 0
    ? configured
    : [...DEFAULT_PII_LABELS];
}

function sanitizeLabel(label: string): string {
  const normalized = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "PII";
}

function normalizeEntity(
  value: unknown,
  sourceText: string
): PiiEntity | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const start =
    typeof item.start === "number"
      ? item.start
      : typeof item.begin === "number"
        ? item.begin
        : null;
  const end =
    typeof item.end === "number"
      ? item.end
      : typeof item.stop === "number"
        ? item.stop
        : null;

  if (
    start === null ||
    end === null ||
    start < 0 ||
    end <= start ||
    end > sourceText.length
  ) {
    return null;
  }

  const labelSource =
    typeof item.label === "string"
      ? item.label
      : typeof item.entity_group === "string"
        ? item.entity_group
        : typeof item.type === "string"
          ? item.type
          : "PII";

  const score = typeof item.score === "number" ? item.score : null;
  const text = sourceText.slice(start, end);

  if (!text.trim()) {
    return null;
  }

  return {
    start,
    end,
    label: labelSource.trim() || "PII",
    text,
    score,
  };
}

function extractEntities(payload: unknown, sourceText: string): PiiEntity[] {
  const flat: PiiEntity[] = [];

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => walk(entry));
      return;
    }

    const parsed = normalizeEntity(value, sourceText);
    if (parsed) {
      flat.push(parsed);
      return;
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (Array.isArray(record.entities)) {
        record.entities.forEach((entry) => walk(entry));
      }
      if (Array.isArray(record.data)) {
        record.data.forEach((entry) => walk(entry));
      }
    }
  };

  walk(payload);

  const deduped = new Map<string, PiiEntity>();
  for (const entity of flat) {
    const key = `${entity.start}:${entity.end}:${entity.label.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing || (entity.score ?? 0) > (existing.score ?? 0)) {
      deduped.set(key, entity);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return a.end - b.end;
  });
}

function redactText(sourceText: string, entities: PiiEntity[]): string {
  if (entities.length === 0) {
    return sourceText;
  }

  let redacted = sourceText;
  const byReverseOrder = [...entities].sort((a, b) => b.start - a.start);

  for (const entity of byReverseOrder) {
    const marker = `[REDACTED_${sanitizeLabel(entity.label)}]`;
    redacted =
      redacted.slice(0, entity.start) + marker + redacted.slice(entity.end);
  }

  return redacted;
}

function toPublicEntities(entities: PiiEntity[]): ParsedPiiEntity[] {
  return entities.map((entity) => ({
    label: entity.label,
    text: entity.text,
    score: entity.score,
  }));
}

async function callGlinerPii(
  endpoint: string,
  apiKey: string,
  text: string,
  labels: string[],
  threshold: number
): Promise<{ entities: PiiEntity[]; warning?: string }> {
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GLINER_PII_API_KEY?.trim() ||
      process.env.HUGGINGFACE_API_KEY?.trim() ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        {
          data: {
            redactedText: parsed.data.text,
            entities: [],
            redactedCount: 0,
            warning: "GLINER_PII_API_KEY is not set. OCR parsing continued.",
          },
        },
        { status: 200 }
      );
    }

    const endpoint =
      process.env.GLINER_PII_ENDPOINT?.trim() || DEFAULT_GLINER_ENDPOINT;
    const labels = getConfiguredLabels();
    const threshold = getEnvNumber("GLINER_PII_THRESHOLD", 0.35);

    const piiResult = await callGlinerPii(
      endpoint,
      apiKey,
      parsed.data.text,
      labels,
      threshold
    );

    const redactedText = redactText(parsed.data.text, piiResult.entities);

    return NextResponse.json(
      {
        data: {
          redactedText,
          entities: toPublicEntities(piiResult.entities),
          redactedCount: piiResult.entities.length,
          ...(piiResult.warning ? { warning: piiResult.warning } : {}),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to detect receipt PII", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}