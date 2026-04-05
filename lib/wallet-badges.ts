export type WalletBadge = {
  code: string;
  kind: "wallet" | "bank";
  toneClass: string;
  labelClass: string;
  iconToneClass: string;
};

const WALLET_BADGES: Array<{
  keywords: string[];
  badge: WalletBadge;
}> = [
  {
    keywords: ["gcash"],
    badge: {
      code: "GC",
      kind: "wallet",
      toneClass: "border border-blue-200/70 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["maya", "paymaya"],
    badge: {
      code: "MY",
      kind: "wallet",
      toneClass: "border border-emerald-200/70 bg-emerald-100/70 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/25 dark:text-emerald-200",
      labelClass: "text-emerald-700/85 dark:text-emerald-300/85",
      iconToneClass: "text-emerald-700 bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  },
  {
    keywords: ["gotyme"],
    badge: {
      code: "GT",
      kind: "wallet",
      toneClass: "border border-amber-200/80 bg-amber-100/70 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-200",
      labelClass: "text-amber-700/85 dark:text-amber-300/85",
      iconToneClass: "text-amber-700 bg-amber-100/70 dark:text-amber-300 dark:bg-amber-900/30",
    },
  },
  {
    keywords: ["grabpay"],
    badge: {
      code: "GP",
      kind: "wallet",
      toneClass: "border border-lime-200/80 bg-lime-100/70 text-lime-800 dark:border-lime-800/60 dark:bg-lime-900/25 dark:text-lime-200",
      labelClass: "text-lime-700/85 dark:text-lime-300/85",
      iconToneClass: "text-lime-700 bg-lime-100/70 dark:text-lime-300 dark:bg-lime-900/30",
    },
  },
  {
    keywords: ["shopeepay"],
    badge: {
      code: "SP",
      kind: "wallet",
      toneClass: "border border-orange-200/80 bg-orange-100/70 text-orange-800 dark:border-orange-800/60 dark:bg-orange-900/25 dark:text-orange-200",
      labelClass: "text-orange-700/85 dark:text-orange-300/85",
      iconToneClass: "text-orange-700 bg-orange-100/70 dark:text-orange-300 dark:bg-orange-900/30",
    },
  },
  {
    keywords: ["coins.ph", "coinsph"],
    badge: {
      code: "CP",
      kind: "wallet",
      toneClass: "border border-sky-200/80 bg-sky-100/70 text-sky-800 dark:border-sky-800/60 dark:bg-sky-900/25 dark:text-sky-200",
      labelClass: "text-sky-700/85 dark:text-sky-300/85",
      iconToneClass: "text-sky-700 bg-sky-100/70 dark:text-sky-300 dark:bg-sky-900/30",
    },
  },
  {
    keywords: ["palawanpay"],
    badge: {
      code: "PP",
      kind: "wallet",
      toneClass: "border border-teal-200/80 bg-teal-100/70 text-teal-800 dark:border-teal-800/60 dark:bg-teal-900/25 dark:text-teal-200",
      labelClass: "text-teal-700/85 dark:text-teal-300/85",
      iconToneClass: "text-teal-700 bg-teal-100/70 dark:text-teal-300 dark:bg-teal-900/30",
    },
  },
  {
    keywords: ["diskartech"],
    badge: {
      code: "DT",
      kind: "wallet",
      toneClass: "border border-violet-200/80 bg-violet-100/70 text-violet-800 dark:border-violet-800/60 dark:bg-violet-900/25 dark:text-violet-200",
      labelClass: "text-violet-700/85 dark:text-violet-300/85",
      iconToneClass: "text-violet-700 bg-violet-100/70 dark:text-violet-300 dark:bg-violet-900/30",
    },
  },
  {
    keywords: ["bpi"],
    badge: {
      code: "BPI",
      kind: "bank",
      toneClass: "border border-red-200/80 bg-red-100/70 text-red-800 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-200",
      labelClass: "text-red-700/85 dark:text-red-300/85",
      iconToneClass: "text-red-700 bg-red-100/70 dark:text-red-300 dark:bg-red-900/30",
    },
  },
  {
    keywords: ["bdo"],
    badge: {
      code: "BDO",
      kind: "bank",
      toneClass: "border border-blue-200/80 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["unionbank"],
    badge: {
      code: "UB",
      kind: "bank",
      toneClass: "border border-amber-200/80 bg-amber-100/70 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-200",
      labelClass: "text-amber-700/85 dark:text-amber-300/85",
      iconToneClass: "text-amber-700 bg-amber-100/70 dark:text-amber-300 dark:bg-amber-900/30",
    },
  },
  {
    keywords: ["landbank"],
    badge: {
      code: "LB",
      kind: "bank",
      toneClass: "border border-emerald-200/80 bg-emerald-100/70 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/25 dark:text-emerald-200",
      labelClass: "text-emerald-700/85 dark:text-emerald-300/85",
      iconToneClass: "text-emerald-700 bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  },
  {
    keywords: ["metrobank"],
    badge: {
      code: "MB",
      kind: "bank",
      toneClass: "border border-blue-200/80 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["rcbc"],
    badge: {
      code: "RCBC",
      kind: "bank",
      toneClass: "border border-blue-200/80 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["security bank"],
    badge: {
      code: "SB",
      kind: "bank",
      toneClass: "border border-emerald-200/80 bg-emerald-100/70 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/25 dark:text-emerald-200",
      labelClass: "text-emerald-700/85 dark:text-emerald-300/85",
      iconToneClass: "text-emerald-700 bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  },
  {
    keywords: ["pnb"],
    badge: {
      code: "PNB",
      kind: "bank",
      toneClass: "border border-slate-300/80 bg-slate-100/70 text-slate-800 dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-200",
      labelClass: "text-slate-700/85 dark:text-slate-300/85",
      iconToneClass: "text-slate-700 bg-slate-100/70 dark:text-slate-300 dark:bg-slate-800/50",
    },
  },
  {
    keywords: ["chinabank"],
    badge: {
      code: "CB",
      kind: "bank",
      toneClass: "border border-red-200/80 bg-red-100/70 text-red-800 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-200",
      labelClass: "text-red-700/85 dark:text-red-300/85",
      iconToneClass: "text-red-700 bg-red-100/70 dark:text-red-300 dark:bg-red-900/30",
    },
  },
  {
    keywords: ["eastwest"],
    badge: {
      code: "EW",
      kind: "bank",
      toneClass: "border border-fuchsia-200/80 bg-fuchsia-100/70 text-fuchsia-800 dark:border-fuchsia-800/60 dark:bg-fuchsia-900/25 dark:text-fuchsia-200",
      labelClass: "text-fuchsia-700/85 dark:text-fuchsia-300/85",
      iconToneClass: "text-fuchsia-700 bg-fuchsia-100/70 dark:text-fuchsia-300 dark:bg-fuchsia-900/30",
    },
  },
  {
    keywords: ["seabank"],
    badge: {
      code: "SEA",
      kind: "bank",
      toneClass: "border border-lime-200/80 bg-lime-100/70 text-lime-800 dark:border-lime-800/60 dark:bg-lime-900/25 dark:text-lime-200",
      labelClass: "text-lime-700/85 dark:text-lime-300/85",
      iconToneClass: "text-lime-700 bg-lime-100/70 dark:text-lime-300 dark:bg-lime-900/30",
    },
  },
  {
    keywords: ["tonik"],
    badge: {
      code: "TON",
      kind: "bank",
      toneClass: "border border-violet-200/80 bg-violet-100/70 text-violet-800 dark:border-violet-800/60 dark:bg-violet-900/25 dark:text-violet-200",
      labelClass: "text-violet-700/85 dark:text-violet-300/85",
      iconToneClass: "text-violet-700 bg-violet-100/70 dark:text-violet-300 dark:bg-violet-900/30",
    },
  },
  {
    keywords: ["uno bank", "uno"],
    badge: {
      code: "UNO",
      kind: "bank",
      toneClass: "border border-emerald-200/80 bg-emerald-100/70 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/25 dark:text-emerald-200",
      labelClass: "text-emerald-700/85 dark:text-emerald-300/85",
      iconToneClass: "text-emerald-700 bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  },
  {
    keywords: ["komo"],
    badge: {
      code: "KOMO",
      kind: "bank",
      toneClass: "border border-sky-200/80 bg-sky-100/70 text-sky-800 dark:border-sky-800/60 dark:bg-sky-900/25 dark:text-sky-200",
      labelClass: "text-sky-700/85 dark:text-sky-300/85",
      iconToneClass: "text-sky-700 bg-sky-100/70 dark:text-sky-300 dark:bg-sky-900/30",
    },
  },
];

export function getWalletBadge(category: string): WalletBadge | null {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return null;

  const matched = WALLET_BADGES.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );

  return matched?.badge ?? null;
}
