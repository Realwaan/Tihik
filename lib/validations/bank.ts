import { z } from "zod";

export const bankConnectionCreateSchema = z.object({
  provider: z.string().trim().min(1),
  providerAccountId: z.string().trim().max(120).optional().nullable(),
  accountLabel: z.string().trim().max(120).optional().nullable(),
  accessToken: z.string().trim().min(8),
  refreshToken: z.string().trim().min(8).optional().nullable(),
  tokenScope: z.string().trim().min(1),
  tokenExpiresAt: z.coerce.date().optional().nullable(),
});

export const bankSyncRequestSchema = z.object({
  connectionId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});
