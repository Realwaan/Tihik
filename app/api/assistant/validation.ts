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
