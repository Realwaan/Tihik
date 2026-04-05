type NormalizationRule = {
  canonical: string;
  patterns: RegExp[];
};

const WALLET_NORMALIZATION_RULES: NormalizationRule[] = [
  { canonical: "GCash", patterns: [/\bgcash\b/i, /\bg\s*cash\b/i] },
  { canonical: "Maya", patterns: [/\bmaya\b/i, /\bpaymaya\b/i] },
  { canonical: "GoTyme", patterns: [/\bgotyme\b/i] },
  { canonical: "GrabPay", patterns: [/\bgrab\s*pay\b/i, /\bgrabpay\b/i] },
  { canonical: "ShopeePay", patterns: [/\bshopee\s*pay\b/i, /\bshopeepay\b/i] },
  { canonical: "Coins.ph", patterns: [/\bcoins\.?ph\b/i, /\bcoins\.ph\b/i] },
  { canonical: "PalawanPay", patterns: [/\bpalawan\s*pay\b/i, /\bpalawanpay\b/i] },
  { canonical: "DiskarTech", patterns: [/\bdiskar\s*tech\b/i, /\bdiskartech\b/i] },
  { canonical: "BPI", patterns: [/\bbpi\b/i] },
  { canonical: "BDO", patterns: [/\bbdo\b/i] },
  { canonical: "UnionBank", patterns: [/\bunion\s*bank\b/i, /\bunionbank\b/i] },
  { canonical: "Landbank", patterns: [/\bland\s*bank\b/i, /\blandbank\b/i] },
  { canonical: "Metrobank", patterns: [/\bmetro\s*bank\b/i, /\bmetrobank\b/i] },
  { canonical: "RCBC", patterns: [/\brcbc\b/i] },
  { canonical: "Security Bank", patterns: [/\bsecurity\s*bank\b/i] },
  { canonical: "PNB", patterns: [/\bpnb\b/i] },
  { canonical: "Chinabank", patterns: [/\bchina\s*bank\b/i, /\bchinabank\b/i] },
  { canonical: "EastWest", patterns: [/\beast\s*west\b/i, /\beastwest\b/i] },
  { canonical: "SeaBank", patterns: [/\bsea\s*bank\b/i, /\bseabank\b/i] },
  { canonical: "Tonik", patterns: [/\btonik\b/i] },
  { canonical: "UNO Bank", patterns: [/\buno\s*bank\b/i, /\buno\b/i] },
  { canonical: "KOMO", patterns: [/\bkomo\b/i] },
  { canonical: "Cash", patterns: [/^cash$/i, /\bcash\s*wallet\b/i] },
];

export function inferCanonicalWalletCategory(category: string): string | null {
  const trimmed = category.trim();
  if (!trimmed) return null;

  const exactRule = WALLET_NORMALIZATION_RULES.find(
    (rule) => rule.canonical.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactRule) {
    return exactRule.canonical;
  }

  const matched = WALLET_NORMALIZATION_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(trimmed))
  );

  return matched?.canonical ?? null;
}
