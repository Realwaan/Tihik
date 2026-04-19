export function buildLocalFallbackReply(
  message: string,
  snapshotInstruction: string,
  providerError?: string
): string {
  const normalized = message.toLowerCase();
  let lead = "Running in local analysis mode.";

  if (providerError) {
    const lower = providerError.toLowerCase();
    const friendlyError =
      lower.includes("quota") || lower.includes("rate limit")
        ? "External AI provider hit a temporary usage limit."
        : "External AI provider is currently unavailable.";
    lead += ` ${friendlyError}`;
  }

  let hint = "Here is a quick analysis from your live dashboard data.";

  if (normalized.includes("budget")) {
    hint =
      "Focus: budget health. Check your limit vs spending and tighten your top category if usage is high.";
  } else if (normalized.includes("spend") || normalized.includes("expense")) {
    hint =
      "Focus: spending. Review top categories and recent activity to spot overspending patterns.";
  } else if (normalized.includes("recurring")) {
    hint =
      "Focus: recurring. Review active templates and upcoming runs in the next 30 days.";
  } else if (
    normalized.includes("shared") ||
    normalized.includes("collaboration")
  ) {
    hint =
      "Focus: collaboration. Check shared household expense totals and settlement suggestions.";
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
    "Snapshot",
    `- Preferred currency: ${preferredCurrency}`,
    `- Current balance: ${balance}`,
    `- Income this month: ${income}`,
    `- Expenses this month: ${expense}`,
    `- Top expense categories: ${topCategories}`,
    `- Budget alerts: ${budgetAlerts}`,
    `- Shared expenses: ${shared}`,
    `- Recurring due (30d): ${recurringDue}`,
    "",
    "Insights",
    hint,
    "",
    "Actions",
    "1. Track one expense category this week and compare it with your budget.",
    "2. Review recurring items due soon and pause any unnecessary ones.",
    "3. If provider errors continue, add a valid AI key or enable billing for full assistant replies.",
  ].join("\n");
}
