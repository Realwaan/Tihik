export type BudgetRow = {
  id: string;
  category: string;
  limit: number;
  month: string;
  spent: number;
  remaining: number;
  usagePercent: number;
  rolloverAmount?: number;
  effectiveLimit?: number;
  parentCategory?: string | null;
  isSubcategory?: boolean;
  missingParentBudget?: boolean;
  isDerivedParent?: boolean;
  hasSubcategories?: boolean;
};

export type BudgetForm = {
  category: string;
  limit: string;
  month: string;
};

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
