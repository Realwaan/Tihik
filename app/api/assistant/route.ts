import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { convertCurrency, convertToUSD, formatCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
  preferredCurrency: z
    .enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"])
    .optional(),
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

const SYSTEM_INSTRUCTION = [
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

type OpenAISuccessPayload = {
  data: { reply: string };
};

type OpenAIErrorPayload = {
  error: string;
  status: number;
};

type GeminiSuccessPayload = {
  data: { reply: string };
};

type GeminiErrorPayload = {
  error: string;
  status: number;
};

async function callOpenAI(
  apiKey: string,
  systemInstruction: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  message: string
): Promise<OpenAISuccessPayload | OpenAIErrorPayload> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: systemInstruction },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error", errorText);

    if (response.status === 401 || response.status === 403) {
      return {
        error: "OpenAI API key is invalid or blocked. Check OPENAI_API_KEY.",
        status: 502,
      };
    }

    if (response.status === 429) {
      return {
        error: "OpenAI quota/rate limit reached. Check usage and billing.",
        status: 502,
      };
    }

    return {
      error: "Assistant service is unavailable right now.",
      status: 502,
    };
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || !reply.trim()) {
    return {
      error: "Assistant returned an empty response.",
      status: 502,
    };
  }

  return { data: { reply: reply.trim() } };
}

async function callGemini(
  apiKey: string,
  systemInstruction: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  message: string
): Promise<GeminiSuccessPayload | GeminiErrorPayload> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          ...history.map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }],
          })),
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error", errorText);

    if (response.status === 401 || response.status === 403) {
      return {
        error: "Gemini API key is invalid or blocked. Check GEMINI_API_KEY.",
        status: 502,
      };
    }

    if (response.status === 429) {
      return {
        error: "Gemini quota/rate limit reached. Check usage and billing.",
        status: 502,
      };
    }

    return {
      error: "Assistant service is unavailable right now.",
      status: 502,
    };
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts
        .map((part: { text?: string }) => part?.text ?? "")
        .join("\n")
        .trim()
    : "";

  if (!reply) {
    return {
      error: "Assistant returned an empty response.",
      status: 502,
    };
  }

  return { data: { reply } };
}

function buildLocalFallbackReply(
  message: string,
  snapshotInstruction: string,
  providerError?: string
) {
  const normalized = message.toLowerCase();
  let lead = "Running in local analysis mode.";

  if (providerError) {
    const lower = providerError.toLowerCase();
    const friendlyError = lower.includes("quota") || lower.includes("rate limit")
      ? "External AI provider hit a temporary usage limit."
      : "External AI provider is currently unavailable.";
    lead += ` ${friendlyError}`;
  }

  let hint =
    "Here is a quick analysis from your live dashboard data.";

  if (normalized.includes("budget")) {
    hint = "Focus: budget health. Check your limit vs spending and tighten your top category if usage is high.";
  } else if (normalized.includes("spend") || normalized.includes("expense")) {
    hint = "Focus: spending. Review top categories and recent activity to spot overspending patterns.";
  } else if (normalized.includes("recurring")) {
    hint = "Focus: recurring. Review active templates and upcoming runs in the next 30 days.";
  } else if (normalized.includes("shared") || normalized.includes("collaboration")) {
    hint = "Focus: collaboration. Check shared household expense totals and settlement suggestions.";
  }

  const getLine = (label: string) =>
    snapshotInstruction
      .split("\n")
      .find((line) => line.startsWith(`${label}:`))
      ?.replace(`${label}: `, "") ?? "N/A";

  const preferredCurrency = getLine("Preferred currency");
  const balance = getLine("Dashboard current balance");
  const income = getLine("Current month income");
  const expense = getLine("Current month expense");
  const topCategories = getLine("Top expense categories this month");
  const budgetAlerts = getLine("Dashboard budget alerts");
  const recurringDue = getLine("Recurring runs due in next 30 days");
  const shared = getLine("Shared household expenses this month");

  return [
    lead,
    "",
    "### Snapshot",
    `- Preferred currency: ${preferredCurrency}`,
    `- Current balance: ${balance}`,
    `- Income this month: ${income}`,
    `- Expenses this month: ${expense}`,
    `- Top expense categories: ${topCategories}`,
    `- Budget alerts: ${budgetAlerts}`,
    `- Shared expenses: ${shared}`,
    `- Recurring due (30d): ${recurringDue}`,
    "",
    "### Insight",
    hint,
    "",
    "### Next Steps",
    "1. Track one expense category this week and compare it with your budget.",
    "2. Review recurring items due soon and pause any unnecessary ones.",
    "3. If provider errors continue, add a valid AI key or enable billing for full assistant replies.",
  ].join("\n");
}

async function buildUserFinanceSnapshot(
  userId: string,
  requestPreferredCurrency?: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP"
): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const recurringWindowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredCurrency: true },
  });
  const preferredCurrency = requestPreferredCurrency ?? user?.preferredCurrency ?? "USD";

  const [
    monthTransactions,
    previousMonthTransactions,
    recentTransactions,
    monthBudgets,
    activeRecurringCount,
    upcomingRecurringCount,
    memberships,
  ] =
    await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        select: {
          amount: true,
          currency: true,
          type: true,
          category: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: previousMonthStart,
            lt: monthStart,
          },
        },
        select: {
          amount: true,
          currency: true,
          type: true,
        },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        select: {
          date: true,
          amount: true,
          currency: true,
          type: true,
          category: true,
        },
      }),
      prisma.budget.findMany({
        where: {
          userId,
          month: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        select: {
          category: true,
          limit: true,
        },
      }),
      prisma.recurringTransaction.count({
        where: {
          userId,
          isActive: true,
        },
      }),
      prisma.recurringTransaction.count({
        where: {
          userId,
          isActive: true,
          nextRunDate: {
            gte: now,
            lte: recurringWindowEnd,
          },
        },
      }),
      prisma.householdMember.findMany({
        where: { userId },
        select: { householdId: true },
      }),
    ]);

  let monthIncomePreferred = 0;
  let monthExpensePreferred = 0;
  const categorySpendPreferred = new Map<string, number>();
  const totalsByCurrency = new Map<string, number>();

  for (const item of monthTransactions) {
    const valuePreferred = convertCurrency(item.amount, item.currency, preferredCurrency);
    const currencyKey = `${item.currency}:${item.type}`;
    totalsByCurrency.set(currencyKey, (totalsByCurrency.get(currencyKey) ?? 0) + item.amount);
    if (item.type === "INCOME") {
      monthIncomePreferred += valuePreferred;
    } else {
      monthExpensePreferred += valuePreferred;
      categorySpendPreferred.set(item.category, (categorySpendPreferred.get(item.category) ?? 0) + valuePreferred);
    }
  }

  const topCategories = Array.from(categorySpendPreferred.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, amount]) => `${category}: ${formatCurrency(amount, preferredCurrency)}`)
    .join(" | ");

  const budgetLimitPreferred = monthBudgets.reduce((sum, item) => sum + item.limit, 0);
  const currentBalancePreferred = monthIncomePreferred - monthExpensePreferred;

  let previousIncomePreferred = 0;
  let previousExpensePreferred = 0;
  for (const item of previousMonthTransactions) {
    const valuePreferred = convertCurrency(item.amount, item.currency, preferredCurrency);
    if (item.type === "INCOME") {
      previousIncomePreferred += valuePreferred;
    } else {
      previousExpensePreferred += valuePreferred;
    }
  }

  const incomeChangePercent =
    previousIncomePreferred > 0
      ? ((monthIncomePreferred - previousIncomePreferred) / previousIncomePreferred) * 100
      : null;
  const expenseChangePercent =
    previousExpensePreferred > 0
      ? ((monthExpensePreferred - previousExpensePreferred) / previousExpensePreferred) * 100
      : null;

  let overBudgetCount = 0;
  let nearBudgetCount = 0;
  for (const budget of monthBudgets) {
    const spent = categorySpendPreferred.get(budget.category) ?? 0;
    const usagePercent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    if (usagePercent >= 100) {
      overBudgetCount += 1;
    } else if (usagePercent >= 80) {
      nearBudgetCount += 1;
    }
  }

  const householdIds = Array.from(new Set(memberships.map((item) => item.householdId)));
  let sharedExpensePreferred = 0;

  if (householdIds.length > 0) {
    const sharedExpenses = await prisma.sharedExpense.findMany({
      where: {
        householdId: { in: householdIds },
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        amount: true,
        currency: true,
      },
    });

    sharedExpensePreferred = sharedExpenses.reduce(
      (sum, item) =>
        sum + convertCurrency(item.amount, item.currency, preferredCurrency),
      0
    );
  }

  const recentActivity = recentTransactions
    .slice(0, 3)
    .map((item) => {
      const sign = item.type === "INCOME" ? "+" : "-";
      const date = item.date.toISOString().slice(0, 10);
      const converted = convertCurrency(item.amount, item.currency, preferredCurrency);
      return `${date} ${item.category} ${sign}${formatCurrency(converted, preferredCurrency)} (${item.amount} ${item.currency})`;
    })
    .join(" | ");

  const rawCurrencyBreakdown = Array.from(totalsByCurrency.entries())
    .map(([key, amount]) => {
      const [currency, type] = key.split(":");
      const sign = type === "INCOME" ? "+" : "-";
      return `${currency} ${sign}${amount.toFixed(currency === "JPY" ? 0 : 2)}`;
    })
    .join(" | ");

  return [
    "Use this real user finance snapshot when relevant.",
    `Preferred currency: ${preferredCurrency}`,
    `Mixed-currency raw totals: ${rawCurrencyBreakdown || "No multi-currency totals yet"}`,
    "Dashboard signals:",
    `Dashboard current balance: ${formatCurrency(currentBalancePreferred, preferredCurrency)}`,
    `Dashboard month-over-month income change: ${incomeChangePercent === null ? "N/A" : `${incomeChangePercent.toFixed(1)}%`}`,
    `Dashboard month-over-month expense change: ${expenseChangePercent === null ? "N/A" : `${expenseChangePercent.toFixed(1)}%`}`,
    `Dashboard budget alerts: ${overBudgetCount} over budget, ${nearBudgetCount} near budget`,
    `Current month income: ${formatCurrency(monthIncomePreferred, preferredCurrency)}`,
    `Current month expense: ${formatCurrency(monthExpensePreferred, preferredCurrency)}`,
    `Top expense categories this month: ${topCategories || "No expense categories yet"}`,
    `Current month budget total limit: ${formatCurrency(budgetLimitPreferred, preferredCurrency)}`,
    `Active recurring templates: ${activeRecurringCount}`,
    `Recurring runs due in next 30 days: ${upcomingRecurringCount}`,
    `Collaboration households joined: ${householdIds.length}`,
    `Shared household expenses this month: ${formatCurrency(sharedExpensePreferred, preferredCurrency)}`,
    `Recent activity: ${recentActivity || "No recent transactions"}`,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

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

    const session = await auth();
    const userName = session?.user?.name?.trim() || "there";
    let snapshotInstruction = "";

    if (session?.user?.id) {
      try {
        snapshotInstruction = await buildUserFinanceSnapshot(
          session.user.id,
          parsed.data.preferredCurrency
        );
      } catch (snapshotError) {
        console.error("Failed to build assistant snapshot", snapshotError);
      }
    }

    const systemText = `${SYSTEM_INSTRUCTION} The current user's name is ${userName}. Preferred display currency for this request is ${parsed.data.preferredCurrency ?? "USD"}. ${snapshotInstruction}`;

    if (openaiKey) {
      const openaiResult = await callOpenAI(
        openaiKey,
        systemText,
        parsed.data.history ?? [],
        parsed.data.message.slice(0, 800)
      );

      if (!("error" in openaiResult)) {
        return NextResponse.json(openaiResult, { status: 200 });
      }

      // If OpenAI key is invalid, return this directly so it is not masked by Gemini fallback errors.
      if (openaiResult.error.toLowerCase().includes("invalid") || openaiResult.error.toLowerCase().includes("blocked")) {
        return NextResponse.json(
          { error: openaiResult.error },
          { status: openaiResult.status }
        );
      }

      if (!geminiKey) {
        return NextResponse.json(
          {
            data: {
              reply: buildLocalFallbackReply(
                parsed.data.message,
                snapshotInstruction,
                openaiResult.error
              ),
            },
          },
          { status: 200 }
        );
      }
    }

    if (geminiKey) {
      const geminiResult = await callGemini(
        geminiKey,
        systemText,
        parsed.data.history ?? [],
        parsed.data.message.slice(0, 800)
      );

      if (!("error" in geminiResult)) {
        return NextResponse.json(geminiResult, { status: 200 });
      }

      return NextResponse.json(
        {
          data: {
            reply: buildLocalFallbackReply(
              parsed.data.message,
              snapshotInstruction,
              geminiResult.error
            ),
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          reply: buildLocalFallbackReply(parsed.data.message, snapshotInstruction),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to handle assistant request", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
