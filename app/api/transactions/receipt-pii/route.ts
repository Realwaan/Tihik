import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  DEFAULT_GLINER_ENDPOINT,
  getConfiguredLabels,
  getEnvNumber,
} from "./config";
import { callGlinerPii } from "./gliner";
import { redactText, toPublicEntities } from "./redaction";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(25000),
});

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