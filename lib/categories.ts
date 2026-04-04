export const PREMADE_EXPENSE_CATEGORIES = [
  "Food",
  "Groceries",
  "Dining",
  "Rent",
  "Utilities",
  "Internet",
  "Transport",
  "Fuel",
  "Healthcare",
  "Insurance",
  "Education",
  "Entertainment",
  "Shopping",
  "Travel",
  "Subscription",
] as const;

export const PREMADE_INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Bonus",
  "Gift",
  "Refund",
  "Interest",
  "Other Income",
] as const;

export const PREMADE_CATEGORIES = Array.from(
  new Set([...PREMADE_EXPENSE_CATEGORIES, ...PREMADE_INCOME_CATEGORIES])
).sort((a, b) => a.localeCompare(b));

type CategoryKind = "all" | "expense" | "income";

export function getPremadeCategories(kind: CategoryKind = "all") {
  if (kind === "expense") return [...PREMADE_EXPENSE_CATEGORIES];
  if (kind === "income") return [...PREMADE_INCOME_CATEGORIES];
  return [...PREMADE_CATEGORIES];
}

export function mergeCategories(
  dynamic: string[],
  kind: CategoryKind = "all"
) {
  const set = new Set(
    [...getPremadeCategories(kind), ...dynamic]
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
