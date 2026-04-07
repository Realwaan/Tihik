export const PH_LOCAL_WALLET_CATEGORIES = [
  "GCash",
  "Maya",
  "GoTyme",
  "GrabPay",
  "ShopeePay",
  "Coins.ph",
  "PalawanPay",
  "DiskarTech",
] as const;

export const PH_BANK_WALLET_CATEGORIES = [
  "BPI",
  "BDO",
  "UnionBank",
  "Landbank",
  "Metrobank",
  "RCBC",
  "Security Bank",
  "PNB",
  "Chinabank",
  "EastWest",
  "SeaBank",
  "Tonik",
  "UNO Bank",
  "KOMO",
] as const;

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
  ...PH_LOCAL_WALLET_CATEGORIES,
  ...PH_BANK_WALLET_CATEGORIES,
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
  ...PH_LOCAL_WALLET_CATEGORIES,
  ...PH_BANK_WALLET_CATEGORIES,
] as const;

export const PREMADE_CATEGORIES = Array.from(
  new Set([...PREMADE_EXPENSE_CATEGORIES, ...PREMADE_INCOME_CATEGORIES])
).sort((a, b) => a.localeCompare(b));

export const CREDIT_ACCOUNT_TEMPLATES = [
  "Visa Credit",
  "Mastercard Credit",
  "Amex Credit",
] as const;

export const ACCOUNT_TEMPLATE_CATEGORIES = [
  ...PH_LOCAL_WALLET_CATEGORIES,
  ...PH_BANK_WALLET_CATEGORIES,
  ...CREDIT_ACCOUNT_TEMPLATES,
  "Cash",
] as const;

export const ACCOUNT_CATEGORIES = [
  ...ACCOUNT_TEMPLATE_CATEGORIES,
] as const;

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
