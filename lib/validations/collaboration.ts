import { z } from "zod";

export const householdCreateSchema = z.object({
  name: z.string().trim().min(1, "Household name is required").max(120),
});

export const householdInviteSchema = z.object({
  householdId: z.string().min(1),
  email: z.string().email("Valid email is required"),
});

export const sharedExpenseCreateSchema = z.object({
  householdId: z.string().min(1),
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .finite("Amount must be valid")
    .positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"]).default("USD"),
  category: z.string().trim().min(1, "Category is required").max(100),
  description: z.string().trim().max(300).optional().nullable(),
  date: z.coerce.date({ invalid_type_error: "Date must be valid" }),
});

export const sharedExpenseUpdateSchema = sharedExpenseCreateSchema
  .pick({
    amount: true,
    currency: true,
    category: true,
    description: true,
    date: true,
  })
  .partial();

export const settlementPaymentCreateSchema = z.object({
  householdId: z.string().min(1),
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amountUsd: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .finite("Amount must be valid")
    .positive("Amount must be greater than 0"),
  dueDate: z.coerce.date({ invalid_type_error: "Due date must be valid" }),
  note: z.string().trim().max(300).optional().nullable(),
});

export const settlementPaymentActionSchema = z.object({
  action: z.enum(["SEND_REMINDER", "MARK_PAID", "MARK_PENDING"]),
});
