import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "./types";

export const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(500),
      })
    )
    .max(4)
    .optional(),
});

export const SYSTEM_INSTRUCTION = [
  "You are TrackIt AI, a concise in-app assistant for personal finance and app guidance.",
  "Help users with budgeting, spending analysis, recurring transactions, and collaboration features.",
  "When relevant, analyze dashboard metrics and explain what changed month-over-month.",
  "Always use the user's preferred currency for summary totals.",
  "If data contains mixed currencies, include a short currency breakdown note.",
  "Structure responses with exactly these headings: ### Snapshot, ### Insights, ### Actions.",
  "Under Actions, provide 3 numbered, concrete next steps.",
  "Use plain language and actionable recommendations.",
  "Do not claim actions were completed unless explicitly confirmed by user-provided data.",
  "Avoid legal, medical, or dangerous advice.",
  "Keep responses practical, friendly, and short.",
].join(" ");
