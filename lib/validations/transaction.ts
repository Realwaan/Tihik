import { z } from "zod";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    return value;
  }

  const [yearText, monthText, dayText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  const now = new Date();
  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
}

const amountSchema = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a valid number")
  .min(0, "Amount cannot be negative");

const dateSchema = z.preprocess(
  parseDateInput,
  z.coerce.date({
    invalid_type_error: "Date must be a valid date",
  })
);

const transactionBaseSchema = z.object({
  amount: amountSchema,
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"]).default("USD"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().trim().max(100).optional().nullable(),
  sourceAccount: z.string().trim().max(100).optional().nullable(),
  destinationAccount: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  date: dateSchema,
});

function toDateStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function validateTransactionData(
  data: z.infer<typeof transactionBaseSchema>,
  ctx: z.RefinementCtx
) {
  const category = data.category?.trim() ?? "";
  const sourceAccount = data.sourceAccount?.trim() ?? "";
  const destinationAccount = data.destinationAccount?.trim() ?? "";

  if (data.amount === 0) {
    if (data.type === "TRANSFER") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Transfer amount must be greater than 0",
      });
      return;
    }

    const todayStart = toDateStart(new Date());
    const transactionDateStart = toDateStart(data.date);
    if (transactionDateStart <= todayStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message:
          "Zero amount is only allowed for future-dated income or expense entries",
      });
    }
  }

  if (data.type === "TRANSFER") {
    if (!sourceAccount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceAccount"],
        message: "Source account is required for transfers",
      });
    }

    if (!destinationAccount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationAccount"],
        message: "Destination account is required for transfers",
      });
    }

    if (
      sourceAccount &&
      destinationAccount &&
      sourceAccount.toLowerCase() === destinationAccount.toLowerCase()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationAccount"],
        message: "Destination account must be different from source account",
      });
    }
    return;
  }

  if (!category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["category"],
      message: "Category is required",
    });
  }
}

export const transactionCreateSchema = transactionBaseSchema.superRefine(
  validateTransactionData
);

export const transactionUpdateSchema = transactionBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    const transactionType = data.type;
    if (!transactionType && data.amount === undefined && data.date === undefined) {
      return;
    }

    const typeForValidation = transactionType ?? "EXPENSE";

    validateTransactionData(
      {
        amount: data.amount ?? 1,
        currency: data.currency ?? "USD",
        type: typeForValidation,
        category: data.category,
        sourceAccount: data.sourceAccount,
        destinationAccount: data.destinationAccount,
        note: data.note,
        date: data.date ?? new Date(),
      },
      ctx
    );
  });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
