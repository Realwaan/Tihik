import { z } from "zod";

const amountSchema = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a valid number")
  .min(0, "Amount cannot be negative");

const positiveAmountSchema = amountSchema.refine((value) => value > 0, {
  message: "Amount must be greater than 0",
});

const dateSchema = z.coerce.date({
  invalid_type_error: "Date must be a valid date",
});

const installmentBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  totalAmount: positiveAmountSchema,
  installmentAmount: positiveAmountSchema,
  totalInstallments: z.coerce
    .number()
    .int("Installments must be a whole number")
    .min(1, "At least one installment is required")
    .max(600, "Installments cannot exceed 600"),
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"]).default("USD"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("MONTHLY"),
  interval: z.coerce.number().int().min(1).max(30).default(1),
  startDate: dateSchema,
  nextDueDate: dateSchema.optional(),
  sourceAccount: z.string().trim().max(100).optional().nullable(),
  accountType: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
  note: z.string().trim().max(500).optional().nullable(),
  paidAmount: amountSchema.optional(),
  paidInstallments: z.coerce.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional(),
});

export const installmentCreateSchema = installmentBaseSchema.superRefine(
  (data, ctx) => {
    if (data.nextDueDate && data.nextDueDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextDueDate"],
        message: "Next due date cannot be earlier than start date",
      });
    }

    if (data.paidInstallments !== undefined && data.paidInstallments > data.totalInstallments * 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidInstallments"],
        message: "Paid installments look too high for this plan",
      });
    }
  }
);

export const installmentUpdateSchema = installmentBaseSchema
  .extend({
    totalAmount: positiveAmountSchema.optional(),
    installmentAmount: positiveAmountSchema.optional(),
    totalInstallments: z.coerce.number().int().min(1).max(600).optional(),
    startDate: dateSchema.optional(),
    nextDueDate: dateSchema.optional().nullable(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.nextDueDate &&
      data.startDate &&
      data.nextDueDate < data.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextDueDate"],
        message: "Next due date cannot be earlier than start date",
      });
    }

    if (
      data.paidInstallments !== undefined &&
      data.totalInstallments !== undefined &&
      data.paidInstallments > data.totalInstallments * 3
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidInstallments"],
        message: "Paid installments look too high for this plan",
      });
    }
  });

export const installmentPaymentCreateSchema = z.object({
  amount: amountSchema,
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"]).optional(),
  paidAt: dateSchema.optional(),
  installmentsCovered: z.coerce.number().int().min(0).max(60).default(1),
  sourceAccount: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  createLinkedTransaction: z.boolean().optional().default(true),
  advanceNextDue: z.boolean().optional().default(true),
  nextDueDate: dateSchema.optional().nullable(),
});

export type InstallmentCreateInput = z.infer<typeof installmentCreateSchema>;
export type InstallmentUpdateInput = z.infer<typeof installmentUpdateSchema>;
export type InstallmentPaymentCreateInput = z.infer<typeof installmentPaymentCreateSchema>;
