import { z } from "zod";

const amountSchema = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a valid number")
  .positive("Amount must be greater than 0");

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be a valid date",
});

export const transactionCreateSchema = z.object({
  amount: amountSchema,
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"]).default("USD"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "Category is required").max(100),
  note: z.string().trim().max(500).optional().nullable(),
  date: dateSchema,
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
