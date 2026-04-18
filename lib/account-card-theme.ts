export type AccountCardTheme = {
  cardClass: string;
  titleClass: string;
  subtitleClass: string;
  balanceLabelClass: string;
  balanceValueClass: string;
  pillClass: string;
  fallbackLogoClass: string;
  watermarkClass: string;
};

function createDarkTheme(cardClass: string): AccountCardTheme {
  return {
    cardClass,
    titleClass: "text-white",
    subtitleClass: "text-white/72",
    balanceLabelClass: "text-white/68",
    balanceValueClass: "text-white",
    pillClass: "border border-white/20 bg-white/10 text-white/80",
    fallbackLogoClass: "border border-white/20 bg-white/10 text-white",
    watermarkClass: "text-white/12",
  };
}

function createLightTheme(cardClass: string): AccountCardTheme {
  return {
    cardClass,
    titleClass: "text-slate-900",
    subtitleClass: "text-slate-600",
    balanceLabelClass: "text-slate-500",
    balanceValueClass: "text-slate-900",
    pillClass: "border border-slate-300/70 bg-white/75 text-slate-600",
    fallbackLogoClass: "border border-slate-300/70 bg-white text-slate-700",
    watermarkClass: "text-slate-400/35",
  };
}

export function getAccountCardTheme(
  category: string,
  group: "cash" | "ewallet" | "bank"
): AccountCardTheme {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("cash")) {
    return createDarkTheme(
      "border-cyan-500/30 bg-gradient-to-br from-[#0c95b7] via-[#0c7ea0] to-[#0e6684] shadow-[0_12px_28px_rgba(14,102,132,0.35)]"
    );
  }

  if (normalized.includes("gcash")) {
    return createDarkTheme(
      "border-blue-500/30 bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] shadow-[0_12px_28px_rgba(30,64,175,0.36)]"
    );
  }

  if (normalized.includes("maya")) {
    return createDarkTheme(
      "border-slate-700/75 bg-gradient-to-br from-[#020617] via-[#020b1f] to-[#020816] shadow-[0_12px_28px_rgba(2,6,23,0.48)]"
    );
  }

  if (normalized.includes("gotyme")) {
    return createDarkTheme(
      "border-cyan-400/30 bg-gradient-to-br from-[#22d3ee] via-[#06b6d4] to-[#0e7490] shadow-[0_12px_28px_rgba(14,116,144,0.36)]"
    );
  }

  if (normalized.includes("maribank") || normalized.includes("mari bank") || normalized.includes("hsbc")) {
    return createLightTheme(
      "border-slate-300/70 bg-gradient-to-br from-[#f8fafc] via-[#eef2f7] to-[#dbe4ee] shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
    );
  }

  if (normalized.includes("unionbank") || normalized.includes("union bank")) {
    return createDarkTheme(
      "border-orange-500/35 bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#9a3412] shadow-[0_12px_28px_rgba(154,52,18,0.36)]"
    );
  }

  if (normalized.includes("bpi") || normalized.includes("bank of commerce") || normalized.includes("bankcom")) {
    return createDarkTheme(
      "border-rose-500/35 bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#9f1239] shadow-[0_12px_28px_rgba(159,18,57,0.36)]"
    );
  }

  if (normalized.includes("shopeepay")) {
    return createDarkTheme(
      "border-orange-500/30 bg-gradient-to-br from-[#fb923c] via-[#ea580c] to-[#c2410c] shadow-[0_12px_28px_rgba(194,65,12,0.36)]"
    );
  }

  if (normalized.includes("grabpay")) {
    return createDarkTheme(
      "border-emerald-500/30 bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#166534] shadow-[0_12px_28px_rgba(22,101,52,0.36)]"
    );
  }

  if (normalized.includes("coins.ph") || normalized.includes("coinsph")) {
    return createDarkTheme(
      "border-sky-500/30 bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0369a1] shadow-[0_12px_28px_rgba(3,105,161,0.36)]"
    );
  }

  if (normalized.includes("palawanpay") || normalized.includes("bayad")) {
    return createDarkTheme(
      "border-teal-500/30 bg-gradient-to-br from-[#14b8a6] via-[#0d9488] to-[#0f766e] shadow-[0_12px_28px_rgba(15,118,110,0.36)]"
    );
  }

  if (group === "ewallet") {
    return createDarkTheme(
      "border-cyan-500/25 bg-gradient-to-br from-[#0f172a] via-[#0f2437] to-[#083344] shadow-[0_12px_28px_rgba(8,51,68,0.38)]"
    );
  }

  if (group === "bank") {
    return createDarkTheme(
      "border-indigo-500/25 bg-gradient-to-br from-[#1e293b] via-[#172554] to-[#0f172a] shadow-[0_12px_28px_rgba(15,23,42,0.42)]"
    );
  }

  return createDarkTheme(
    "border-slate-600/30 bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0f172a] shadow-[0_12px_28px_rgba(15,23,42,0.4)]"
  );
}
