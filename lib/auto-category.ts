type TransactionType = "INCOME" | "EXPENSE";

type HistoryItem = {
  note: string;
  category: string;
};

const EXPENSE_KEYWORDS: Array<{ keyword: RegExp; category: string }> = [
  { keyword: /(grocery|supermarket|mart)/i, category: "Groceries" },
  { keyword: /(restaurant|cafe|coffee|food|dining)/i, category: "Food" },
  { keyword: /(fuel|gas|petrol|shell|caltex)/i, category: "Fuel" },
  { keyword: /(grab|uber|taxi|bus|train|transport|fare)/i, category: "Transport" },
  { keyword: /(pharmacy|hospital|clinic|medical|doctor)/i, category: "Healthcare" },
  { keyword: /(electric|water|internet|phone|utility|bill)/i, category: "Utilities" },
  { keyword: /(netflix|spotify|subscription|youtube|icloud)/i, category: "Subscription" },
  { keyword: /(mall|shopping|store|retail)/i, category: "Shopping" },
  { keyword: /(rent|landlord|apartment)/i, category: "Rent" },
];

const INCOME_KEYWORDS: Array<{ keyword: RegExp; category: string }> = [
  { keyword: /(salary|payroll|wage)/i, category: "Salary" },
  { keyword: /(freelance|client|gig|project payment)/i, category: "Freelance" },
  { keyword: /(dividend|interest|investment)/i, category: "Investment" },
  { keyword: /(bonus)/i, category: "Bonus" },
  { keyword: /(refund)/i, category: "Refund" },
  { keyword: /(gift)/i, category: "Gift" },
];

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function fromKeywords(note: string, type: TransactionType): string | null {
  const rules = type === "INCOME" ? INCOME_KEYWORDS : EXPENSE_KEYWORDS;
  const matched = rules.find((rule) => rule.keyword.test(note));
  return matched ? matched.category : null;
}

function fromHistory(note: string, history: HistoryItem[]): string | null {
  const normalizedNote = normalize(note);
  if (!normalizedNote) return null;

  const ranked = new Map<string, number>();
  for (const item of history) {
    const historicalNote = normalize(item.note);
    if (!historicalNote) continue;

    if (
      normalizedNote.includes(historicalNote) ||
      historicalNote.includes(normalizedNote)
    ) {
      ranked.set(item.category, (ranked.get(item.category) ?? 0) + 2);
    }

    const noteTokens = normalizedNote.split(/\s+/).filter((token) => token.length >= 4);
    if (noteTokens.some((token) => historicalNote.includes(token))) {
      ranked.set(item.category, (ranked.get(item.category) ?? 0) + 1);
    }
  }

  let bestCategory: string | null = null;
  let bestScore = 0;
  for (const [category, score] of ranked.entries()) {
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }
  return bestCategory;
}

export function suggestCategoryFromNote(
  note: string,
  type: TransactionType,
  history: HistoryItem[] = []
) {
  return fromKeywords(note, type) ?? fromHistory(note, history) ?? null;
}
