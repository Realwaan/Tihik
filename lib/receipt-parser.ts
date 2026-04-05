type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";

export type ReceiptParseResult = {
  amount?: number;
  currency?: CurrencyCode;
  date?: string;
  category?: string;
  merchant?: string;
};

function normalizeOcrText(text: string): string {
  return text
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[|]/g, "I")
    .replace(/\bS\$/g, "$")
    .replace(/[\u00A0\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
  const normalized = normalizeOcrText(text);
  const patterns = [
    /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/,
    /\b(\d{4})\.(\d{2})\.(\d{2})\b/,
    /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/,
    /\b(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{4})\b/i,
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  ];

  const monthMap: Record<string, string> = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    if (pattern === patterns[0]) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    if (pattern === patterns[1]) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    if (pattern === patterns[2]) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      const year = match[3];

      // If first token can't be month, treat as DD/MM/YYYY.
      if (first > 12 && second <= 12) {
        return `${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
      }

      // Default to MM/DD/YYYY for ambiguous numeric dates.
      return `${year}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`;
    }

    if (pattern === patterns[3]) {
      const day = String(Number(match[1])).padStart(2, "0");
      const month = monthMap[match[2].toLowerCase()];
      return `${match[3]}-${month}-${day}`;
    }

    const month = monthMap[match[1].toLowerCase()];
    const day = String(Number(match[2])).padStart(2, "0");
    return `${match[3]}-${month}-${day}`;
  }

  return undefined;
}

function parseAmount(text: string): number | undefined {
  const lines = normalizeOcrText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const priorityLines = lines.filter((line) =>
    /(grand\s*total|total\s*due|amount\s*due|total)/i.test(line)
  );
  const candidateLines = priorityLines.length > 0 ? priorityLines : lines;

  const values: number[] = [];

  const parseNumericAmount = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.,-]/g, "").trim();
    if (!cleaned) return undefined;

    // Handle 1.234,56 style decimals.
    if (/\d+\.\d{3},\d{2}$/.test(cleaned)) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      const value = Number(normalized);
      return Number.isFinite(value) ? value : undefined;
    }

    const normalized = cleaned.replace(/,/g, "");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : undefined;
  };

  for (const line of candidateLines) {
    const matches = line.matchAll(/\(?[-+]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\)?|\(?[-+]?\d+(?:[.,]\d{2})\)?/g);
    for (const match of matches) {
      const value = parseNumericAmount(match[0]);
      if (Number.isFinite(value)) {
        values.push(Math.abs(value as number));
      }
    }
  }

  if (values.length === 0) return undefined;
  return Math.max(...values);
}

function inferCategory(text: string): string | undefined {
  const normalized = normalizeOcrText(text).toLowerCase();
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
  const blacklist = /(receipt|invoice|total|subtotal|tax|vat|amount|balance|date|time|cashier|tel|phone|approval|auth|change|qty|item|payment|card|visa|mastercard)/i;

  const lines = normalizeOcrText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  const candidates = lines.filter((line) => {
    if (line.length < 3) return false;
    if (line.length > 48) return false;
    if (blacklist.test(line)) return false;
    if (/^\d+[\d\s,./-]*$/.test(line)) return false;
    if (/^[^A-Za-z]+$/.test(line)) return false;
    return true;
  });

  const merchant = candidates[0];
  if (!merchant) return undefined;

  return merchant.replace(/\s{2,}/g, " ");
}

export function parseReceiptText(
  text: string,
  fallbackCurrency: CurrencyCode
): ReceiptParseResult {
  const normalized = normalizeOcrText(text);

  return {
    amount: parseAmount(normalized),
    currency: detectCurrency(normalized, fallbackCurrency),
    date: parseDate(normalized),
    category: inferCategory(normalized),
    merchant: parseMerchant(normalized),
  };
}
