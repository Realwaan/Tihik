import { z } from "zod";

const amountSchema = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a valid number")
  .positive("Amount must be greater than 0");

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be a valid date",
});

export const recurringCreateSchema = z.object({
  amount: amountSchema,
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"]).default("USD"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "Category is required").max(100),
  note: z.string().trim().max(500).optional().nullable(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  interval: z.coerce.number().int().min(1).max(30).default(1),
  startDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const recurringUpdateSchema = recurringCreateSchema.partial();

export type RecurringCreateInput = z.infer<typeof recurringCreateSchema>;
export type RecurringUpdateInput = z.infer<typeof recurringUpdateSchema>;
