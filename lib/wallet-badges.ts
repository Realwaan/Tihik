export type WalletBadge = {
  code: string;
  kind: "wallet" | "bank";
  toneClass: string;
  labelClass: string;
  iconToneClass: string;
  logoText: string;
  logoGradientClass: string;
  officialLogoPath?: string;
  officialLogoUrl?: string;
};

type WalletBadgeSeed = Omit<WalletBadge, "logoText" | "logoGradientClass">;

type LogoOverride = {
  logoText: string;
  logoGradientClass: string;
  officialLogoPath?: string;
  officialLogoUrl?: string;
};

const WALLET_LOGO_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-lime-500 to-emerald-600",
  "from-cyan-500 to-sky-600",
  "from-violet-500 to-indigo-600",
];

const BANK_LOGO_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-rose-500 to-red-700",
  "from-emerald-600 to-green-700",
  "from-amber-600 to-orange-700",
  "from-fuchsia-600 to-pink-700",
  "from-slate-600 to-slate-800",
];

const LOGO_OVERRIDES_BY_CODE: Record<string, LogoOverride> = {
  GC: {
    logoText: "G",
    logoGradientClass: "from-[#0057ff] to-[#00a2ff]",
    officialLogoPath: "/logos/wallets/gcash.svg",
    officialLogoUrl: "https://logo.clearbit.com/gcash.com",
  },
  MY: {
    logoText: "M",
    logoGradientClass: "from-[#00d17b] to-[#007a52]",
    officialLogoPath: "/logos/wallets/maya.svg",
    officialLogoUrl: "https://logo.clearbit.com/maya.ph",
  },
  GT: {
    logoText: "G",
    logoGradientClass: "from-[#f4c430] to-[#cc8f00]",
    officialLogoPath: "/logos/wallets/gotyme.svg",
    officialLogoUrl: "https://logo.clearbit.com/gotyme.com.ph",
  },
  GP: {
    logoText: "G",
    logoGradientClass: "from-[#00b14f] to-[#007f39]",
    officialLogoPath: "/logos/wallets/grabpay.svg",
    officialLogoUrl: "https://logo.clearbit.com/grab.com",
  },
  SP: {
    logoText: "S",
    logoGradientClass: "from-[#ff6a2b] to-[#ee4d2d]",
    officialLogoPath: "/logos/wallets/shopeepay.svg",
    officialLogoUrl: "https://logo.clearbit.com/shopee.ph",
  },
  CP: {
    logoText: "C",
    logoGradientClass: "from-[#0052ff] to-[#009bff]",
    officialLogoPath: "/logos/wallets/coins-ph.svg",
    officialLogoUrl: "https://logo.clearbit.com/coins.ph",
  },
  PP: {
    logoText: "P",
    logoGradientClass: "from-[#05a98c] to-[#067a6e]",
    officialLogoPath: "/logos/wallets/palawanpay.svg",
    officialLogoUrl: "https://logo.clearbit.com/palawanpay.com",
  },
  DT: {
    logoText: "D",
    logoGradientClass: "from-[#7c3aed] to-[#5b21b6]",
    officialLogoPath: "/logos/wallets/diskartech.svg",
    officialLogoUrl: "https://logo.clearbit.com/diskartech.ph",
  },
  BA: {
    logoText: "B",
    logoGradientClass: "from-[#0ea5e9] to-[#0f766e]",
    officialLogoPath: "/logos/wallets/bayad-app.svg",
    officialLogoUrl: "https://logo.clearbit.com/bayad.com",
  },
  MBK: {
    logoText: "M",
    logoGradientClass: "from-[#f8fafc] to-[#cbd5e1]",
    officialLogoPath: "/logos/wallets/maribank.svg",
    officialLogoUrl: "https://logo.clearbit.com/maribank.ph",
  },
  BPI: {
    logoText: "B",
    logoGradientClass: "from-[#c1121f] to-[#8f0f18]",
    officialLogoPath: "/logos/banks/bpi.svg",
    officialLogoUrl: "https://logo.clearbit.com/bpi.com.ph",
  },
  BDO: {
    logoText: "B",
    logoGradientClass: "from-[#0a4fa3] to-[#1d9bf0]",
    officialLogoPath: "/logos/banks/bdo.svg",
    officialLogoUrl: "https://logo.clearbit.com/bdo.com.ph",
  },
  UB: {
    logoText: "U",
    logoGradientClass: "from-[#f97316] to-[#ea580c]",
    officialLogoPath: "/logos/banks/unionbank.svg",
    officialLogoUrl: "https://logo.clearbit.com/unionbankph.com",
  },
  LB: {
    logoText: "L",
    logoGradientClass: "from-[#15803d] to-[#166534]",
    officialLogoPath: "/logos/banks/landbank.svg",
    officialLogoUrl: "https://logo.clearbit.com/landbank.com",
  },
  MB: {
    logoText: "M",
    logoGradientClass: "from-[#1d4ed8] to-[#dc2626]",
    officialLogoPath: "/logos/banks/metrobank.svg",
    officialLogoUrl: "https://logo.clearbit.com/metrobank.com.ph",
  },
  RCBC: {
    logoText: "R",
    logoGradientClass: "from-[#1d4ed8] to-[#1e3a8a]",
    officialLogoPath: "/logos/banks/rcbc.svg",
    officialLogoUrl: "https://logo.clearbit.com/rcbc.com",
  },
  SB: {
    logoText: "S",
    logoGradientClass: "from-[#0ea5e9] to-[#059669]",
    officialLogoPath: "/logos/banks/security-bank.svg",
    officialLogoUrl: "https://logo.clearbit.com/securitybank.com",
  },
  PNB: {
    logoText: "P",
    logoGradientClass: "from-[#1e3a8a] to-[#be123c]",
    officialLogoPath: "/logos/banks/pnb.svg",
    officialLogoUrl: "https://logo.clearbit.com/pnb.com.ph",
  },
  CB: {
    logoText: "C",
    logoGradientClass: "from-[#ef4444] to-[#b91c1c]",
    officialLogoPath: "/logos/banks/chinabank.svg",
    officialLogoUrl: "https://logo.clearbit.com/chinabank.ph",
  },
  EW: {
    logoText: "E",
    logoGradientClass: "from-[#d946ef] to-[#a21caf]",
    officialLogoPath: "/logos/banks/eastwest.svg",
    officialLogoUrl: "https://logo.clearbit.com/eastwestbanker.com",
  },
  SEA: {
    logoText: "S",
    logoGradientClass: "from-[#f97316] to-[#ea580c]",
    officialLogoPath: "/logos/banks/seabank.svg",
    officialLogoUrl: "https://logo.clearbit.com/seabank.ph",
  },
  TON: {
    logoText: "T",
    logoGradientClass: "from-[#7c3aed] to-[#6d28d9]",
    officialLogoPath: "/logos/banks/tonik.svg",
    officialLogoUrl: "https://logo.clearbit.com/tonikbank.com",
  },
  UNO: {
    logoText: "U",
    logoGradientClass: "from-[#16a34a] to-[#15803d]",
    officialLogoPath: "/logos/banks/uno-bank.svg",
    officialLogoUrl: "https://logo.clearbit.com/unobank.asia",
  },
  KOMO: {
    logoText: "K",
    logoGradientClass: "from-[#0284c7] to-[#0369a1]",
    officialLogoPath: "/logos/banks/komo.svg",
    officialLogoUrl: "https://logo.clearbit.com/komo.ph",
  },
  PSB: {
    logoText: "P",
    logoGradientClass: "from-[#dc2626] to-[#991b1b]",
    officialLogoPath: "/logos/banks/psbank.svg",
    officialLogoUrl: "https://logo.clearbit.com/psbank.com.ph",
  },
  DBP: {
    logoText: "D",
    logoGradientClass: "from-[#1d4ed8] to-[#0f766e]",
    officialLogoPath: "/logos/banks/dbp.svg",
    officialLogoUrl: "https://logo.clearbit.com/dbp.ph",
  },
  AUB: {
    logoText: "A",
    logoGradientClass: "from-[#1e3a8a] to-[#334155]",
    officialLogoPath: "/logos/banks/aub.svg",
    officialLogoUrl: "https://logo.clearbit.com/aub.com.ph",
  },
  MAY: {
    logoText: "M",
    logoGradientClass: "from-[#facc15] to-[#0f766e]",
    officialLogoPath: "/logos/banks/maybank.svg",
    officialLogoUrl: "https://logo.clearbit.com/maybank.com.ph",
  },
  HSBC: {
    logoText: "H",
    logoGradientClass: "from-[#ffffff] to-[#d4d4d8]",
    officialLogoPath: "/logos/banks/hsbc.svg",
    officialLogoUrl: "https://logo.clearbit.com/hsbc.com.ph",
  },
  BOC: {
    logoText: "BC",
    logoGradientClass: "from-[#ef4444] to-[#7f1d1d]",
    officialLogoPath: "/logos/banks/bank-of-commerce.svg",
    officialLogoUrl: "https://logo.clearbit.com/bankcom.com.ph",
  },
  SBA: {
    logoText: "S",
    logoGradientClass: "from-[#2563eb] to-[#0f172a]",
    officialLogoPath: "/logos/banks/sterling-bank-of-asia.svg",
    officialLogoUrl: "https://logo.clearbit.com/sterlingbankasia.com",
  },
  BNET: {
    logoText: "BN",
    logoGradientClass: "from-[#1d4ed8] to-[#1e40af]",
    officialLogoPath: "/logos/banks/bancnet.svg",
    officialLogoUrl: "https://logo.clearbit.com/bancnetonline.com",
  },
  CIR: {
    logoText: "C",
    logoGradientClass: "from-[#f97316] to-[#ea580c]",
    officialLogoPath: "/logos/banks/cirrus.svg",
    officialLogoUrl: "https://logo.clearbit.com/mastercard.com",
  },
  VPL: {
    logoText: "V",
    logoGradientClass: "from-[#1d4ed8] to-[#f59e0b]",
    officialLogoPath: "/logos/banks/visa-plus.svg",
    officialLogoUrl: "https://logo.clearbit.com/visa.com",
  },
};

function normalizeLogoText(code: string) {
  const compact = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!compact) return "WL";
  return compact.length <= 2 ? compact : compact.slice(0, 2);
}

function pickGradient(seed: string, kind: "wallet" | "bank") {
  const source = kind === "bank" ? BANK_LOGO_GRADIENTS : WALLET_LOGO_GRADIENTS;
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return source[hash % source.length];
}

const WALLET_BADGES: Array<{
  keywords: string[];
  badge: WalletBadgeSeed;
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
    keywords: ["gotyme", "gotyme wallet"],
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
    keywords: ["bayad app", "bayad"],
    badge: {
      code: "BA",
      kind: "wallet",
      toneClass: "border border-cyan-200/80 bg-cyan-100/70 text-cyan-800 dark:border-cyan-800/60 dark:bg-cyan-900/25 dark:text-cyan-200",
      labelClass: "text-cyan-700/85 dark:text-cyan-300/85",
      iconToneClass: "text-cyan-700 bg-cyan-100/70 dark:text-cyan-300 dark:bg-cyan-900/30",
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
    keywords: ["maribank", "mari bank"],
    badge: {
      code: "MBK",
      kind: "wallet",
      toneClass: "border border-slate-300/80 bg-slate-100/80 text-slate-800 dark:border-slate-600/70 dark:bg-slate-700/50 dark:text-slate-100",
      labelClass: "text-slate-700/85 dark:text-slate-200/90",
      iconToneClass: "text-slate-700 bg-slate-100/80 dark:text-slate-200 dark:bg-slate-700/60",
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
    keywords: ["bdo", "bdo unibank"],
    badge: {
      code: "BDO",
      kind: "bank",
      toneClass: "border border-blue-200/80 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["unionbank", "union bank"],
    badge: {
      code: "UB",
      kind: "bank",
      toneClass: "border border-amber-200/80 bg-amber-100/70 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-200",
      labelClass: "text-amber-700/85 dark:text-amber-300/85",
      iconToneClass: "text-amber-700 bg-amber-100/70 dark:text-amber-300 dark:bg-amber-900/30",
    },
  },
  {
    keywords: ["landbank", "land bank"],
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
    keywords: ["security bank", "securitybank"],
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
    keywords: ["chinabank", "china bank"],
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
    keywords: ["seabank", "sea bank"],
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
  {
    keywords: ["psbank", "philippine savings bank"],
    badge: {
      code: "PSB",
      kind: "bank",
      toneClass: "border border-red-200/80 bg-red-100/70 text-red-800 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-200",
      labelClass: "text-red-700/85 dark:text-red-300/85",
      iconToneClass: "text-red-700 bg-red-100/70 dark:text-red-300 dark:bg-red-900/30",
    },
  },
  {
    keywords: ["dbp", "development bank of the philippines"],
    badge: {
      code: "DBP",
      kind: "bank",
      toneClass: "border border-cyan-200/80 bg-cyan-100/70 text-cyan-800 dark:border-cyan-800/60 dark:bg-cyan-900/25 dark:text-cyan-200",
      labelClass: "text-cyan-700/85 dark:text-cyan-300/85",
      iconToneClass: "text-cyan-700 bg-cyan-100/70 dark:text-cyan-300 dark:bg-cyan-900/30",
    },
  },
  {
    keywords: ["aub", "asia united bank"],
    badge: {
      code: "AUB",
      kind: "bank",
      toneClass: "border border-indigo-200/80 bg-indigo-100/70 text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-900/25 dark:text-indigo-200",
      labelClass: "text-indigo-700/85 dark:text-indigo-300/85",
      iconToneClass: "text-indigo-700 bg-indigo-100/70 dark:text-indigo-300 dark:bg-indigo-900/30",
    },
  },
  {
    keywords: ["maybank"],
    badge: {
      code: "MAY",
      kind: "bank",
      toneClass: "border border-yellow-200/80 bg-yellow-100/70 text-yellow-900 dark:border-yellow-700/60 dark:bg-yellow-900/30 dark:text-yellow-200",
      labelClass: "text-yellow-800/90 dark:text-yellow-200/90",
      iconToneClass: "text-yellow-800 bg-yellow-100/70 dark:text-yellow-200 dark:bg-yellow-900/35",
    },
  },
  {
    keywords: ["hsbc"],
    badge: {
      code: "HSBC",
      kind: "bank",
      toneClass: "border border-slate-300/80 bg-slate-100/80 text-slate-800 dark:border-slate-600/70 dark:bg-slate-700/50 dark:text-slate-100",
      labelClass: "text-slate-700/85 dark:text-slate-200/90",
      iconToneClass: "text-slate-700 bg-slate-100/80 dark:text-slate-200 dark:bg-slate-700/60",
    },
  },
  {
    keywords: ["bank of commerce", "bankcom"],
    badge: {
      code: "BOC",
      kind: "bank",
      toneClass: "border border-rose-200/80 bg-rose-100/70 text-rose-800 dark:border-rose-800/60 dark:bg-rose-900/25 dark:text-rose-200",
      labelClass: "text-rose-700/85 dark:text-rose-300/85",
      iconToneClass: "text-rose-700 bg-rose-100/70 dark:text-rose-300 dark:bg-rose-900/30",
    },
  },
  {
    keywords: ["sterling bank of asia", "sterling"],
    badge: {
      code: "SBA",
      kind: "bank",
      toneClass: "border border-blue-200/80 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["bancnet"],
    badge: {
      code: "BNET",
      kind: "bank",
      toneClass: "border border-blue-200/80 bg-blue-100/70 text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/25 dark:text-blue-200",
      labelClass: "text-blue-700/85 dark:text-blue-300/85",
      iconToneClass: "text-blue-700 bg-blue-100/70 dark:text-blue-300 dark:bg-blue-900/30",
    },
  },
  {
    keywords: ["cirrus"],
    badge: {
      code: "CIR",
      kind: "bank",
      toneClass: "border border-orange-200/80 bg-orange-100/70 text-orange-800 dark:border-orange-800/60 dark:bg-orange-900/25 dark:text-orange-200",
      labelClass: "text-orange-700/85 dark:text-orange-300/85",
      iconToneClass: "text-orange-700 bg-orange-100/70 dark:text-orange-300 dark:bg-orange-900/30",
    },
  },
  {
    keywords: ["visa plus", "plus atm", "visa+"],
    badge: {
      code: "VPL",
      kind: "bank",
      toneClass: "border border-indigo-200/80 bg-indigo-100/70 text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-900/25 dark:text-indigo-200",
      labelClass: "text-indigo-700/85 dark:text-indigo-300/85",
      iconToneClass: "text-indigo-700 bg-indigo-100/70 dark:text-indigo-300 dark:bg-indigo-900/30",
    },
  },
];

export function getWalletBadge(category: string): WalletBadge | null {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return null;

  const matched = WALLET_BADGES.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );

  if (!matched) return null;

  const logoOverride = LOGO_OVERRIDES_BY_CODE[matched.badge.code.toUpperCase()];

  return {
    ...matched.badge,
    logoText: logoOverride?.logoText ?? normalizeLogoText(matched.badge.code),
    logoGradientClass:
      logoOverride?.logoGradientClass ?? pickGradient(normalized, matched.badge.kind),
    officialLogoPath: logoOverride?.officialLogoPath,
    officialLogoUrl: logoOverride?.officialLogoUrl,
  };
}
