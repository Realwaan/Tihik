import { Currency } from "@prisma/client";

const USD_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.66,
  PHP: 0.018,
};

export const SUPPORTED_CURRENCIES: Currency[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "PHP",
];

export function convertToUSD(amount: number, currency: Currency): number {
  const rate = USD_RATES[currency];
  return amount * rate;
}

export function getUsdRate(currency: Currency): number {
  return USD_RATES[currency];
}

export function convertFromUSD(amount: number, currency: Currency): number {
  const rate = USD_RATES[currency];
  return amount / rate;
}

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const usdAmount = convertToUSD(amount, fromCurrency);
  const converted = convertFromUSD(usdAmount, toCurrency);
  return roundForCurrency(converted, toCurrency);
}

export function convertCurrencyWithRateLock(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  options?: { lockedUsdRate?: number }
): {
  amount: number;
  rateUsed: number;
  lockedRate: boolean;
} {
  if (fromCurrency === toCurrency) {
    return {
      amount,
      rateUsed: 1,
      lockedRate: Boolean(options?.lockedUsdRate),
    };
  }

  const effectiveFromRate = options?.lockedUsdRate ?? getUsdRate(fromCurrency);
  const toRate = getUsdRate(toCurrency);
  const usdAmount = amount * effectiveFromRate;
  const converted = usdAmount / toRate;

  return {
    amount: roundForCurrency(converted, toCurrency),
    rateUsed: effectiveFromRate / toRate,
    lockedRate: Boolean(options?.lockedUsdRate),
  };
}

export function roundForCurrency(amount: number, currency: Currency): number {
  if (currency === "JPY") {
    return Math.round(amount);
  }
  return Number(amount.toFixed(2));
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}
