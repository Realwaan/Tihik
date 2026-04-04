type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";

export type ReceiptParseResult = {
  amount?: number;
  currency?: CurrencyCode;
  date?: string;
  category?: string;
  merchant?: string;
};

function detectCurrency(text: string, fallback: CurrencyCode): CurrencyCode {
  const normalized = text.toUpperCase();
  if (normalized.includes("₱") || normalized.includes("PHP")) return "PHP";
  if (normalized.includes("€") || normalized.includes("EUR")) return "EUR";
  if (normalized.includes("£") || normalized.includes("GBP")) return "GBP";
  if (normalized.includes("¥") || normalized.includes("JPY")) return "JPY";
  if (normalized.includes("CAD")) return "CAD";
  if (normalized.includes("AUD")) return "AUD";
  if (normalized.includes("$") || normalized.includes("USD")) return "USD";
  return fallback;
}

function parseDate(text: string): string | undefined {
  const patterns = [
    /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/,
    /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    if (pattern === patterns[0]) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    return `${match[3]}-${match[1]}-${match[2]}`;
  }

  return undefined;
}

function parseAmount(text: string): number | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const priorityLines = lines.filter((line) =>
    /(grand\s*total|total\s*due|amount\s*due|total)/i.test(line)
  );
  const candidateLines = priorityLines.length > 0 ? priorityLines : lines;

  const values: number[] = [];
  for (const line of candidateLines) {
    const matches = line.matchAll(/\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b|\b\d+(?:\.\d{2})\b/g);
    for (const match of matches) {
      const value = Number(match[0].replace(/,/g, ""));
      if (Number.isFinite(value)) {
        values.push(value);
      }
    }
  }

  if (values.length === 0) return undefined;
  return Math.max(...values);
}

function inferCategory(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (/(grocery|supermarket|mart)/.test(normalized)) return "Groceries";
  if (/(restaurant|cafe|coffee|dining|food)/.test(normalized)) return "Food";
  if (/(fuel|gas|petrol)/.test(normalized)) return "Fuel";
  if (/(taxi|grab|uber|transport|fare|bus|train)/.test(normalized)) return "Transport";
  if (/(pharmacy|hospital|clinic|medical)/.test(normalized)) return "Healthcare";
  if (/(internet|mobile|phone|telecom|utility|electric|water)/.test(normalized))
    return "Utilities";
  if (/(subscription|netflix|spotify|youtube)/.test(normalized)) return "Subscription";
  if (/(mall|shopping|retail|store)/.test(normalized)) return "Shopping";
  return undefined;
}

function parseMerchant(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const merchant = lines.find(
    (line) =>
      line.length > 2 &&
      !/(receipt|invoice|total|date|time|cashier|tel|phone)/i.test(line)
  );
  return merchant;
}

export function parseReceiptText(
  text: string,
  fallbackCurrency: CurrencyCode
): ReceiptParseResult {
  return {
    amount: parseAmount(text),
    currency: detectCurrency(text, fallbackCurrency),
    date: parseDate(text),
    category: inferCategory(text),
    merchant: parseMerchant(text),
  };
}
