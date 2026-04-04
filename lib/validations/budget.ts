import { z } from "zod";

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const budgetCreateSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(100),
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number" })
    .finite("Limit must be a valid number")
    .positive("Limit must be greater than 0"),
  month: z
    .string()
    .regex(monthRegex, "Month must be in YYYY-MM format"),
});

export const budgetUpdateSchema = budgetCreateSchema
  .pick({
    category: true,
    limit: true,
    month: true,
  })
  .partial();

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
