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

  const lines = snapshotInstruction
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const getLine = (label: string) => {
    const line = lines.find((entry) => entry.startsWith(`${label}:`));
    if (!line) {
      return null;
    }

    const value = line.slice(label.length + 1).trim();
    return value.length > 0 ? value : null;
  };

  const snapshotRows = [
    ["Preferred currency", getLine("Preferred currency")],
    ["Current balance", getLine("Dashboard current balance")],
    ["Income this month", getLine("Current month income")],
    ["Expenses this month", getLine("Current month expense")],
    ["Top expense categories", getLine("Top expense categories this month")],
    ["Budget alerts", getLine("Dashboard budget alerts")],
    ["Shared expenses", getLine("Shared household expenses this month")],
    ["Recurring due (30d)", getLine("Recurring runs due in next 30 days")],
  ].filter(([, value]) => value !== null) as Array<[string, string]>;

  const hasSnapshotData = snapshotRows.length > 0;

  if (!hasSnapshotData) {
    lead += " I could not load account snapshot data for this response.";
  }

  return [
    lead,
    "",
    "Snapshot",
    ...(hasSnapshotData
      ? snapshotRows.map(([label, value]) => `- ${label}: ${value}`)
      : ["- No dashboard data available yet. Add transactions or sign in to load your snapshot." ]),
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
