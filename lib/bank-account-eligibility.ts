export const BANK_INTEGRATION_CREDIT_ONLY_MESSAGE =
  "Bank integration is allowed for credit-card accounts only (for example: Visa Credit, Mastercard Credit, Amex Credit).";

const CREDIT_CARD_PATTERN =
  /\b(credit|visa|master\s*card|mastercard|amex|american\s*express)\b/i;

const NON_CREDIT_WALLET_PATTERN =
  /\b(cash|gcash|maya|paymaya|grabpay|shopeepay|coins\.?ph|palawanpay|bayad|diskartech)\b/i;

export function isCreditCardLikeAccount(input: string | null | undefined): boolean {
  const normalized = (input ?? "").trim();

  if (!normalized) {
    return false;
  }

  if (NON_CREDIT_WALLET_PATTERN.test(normalized)) {
    return false;
  }

  return CREDIT_CARD_PATTERN.test(normalized);
}