const DEFAULT_PII_LABELS = [
  "name",
  "email address",
  "phone number",
  "account number",
  "bank account",
  "routing number",
  "credit card",
  "credit card expiration",
  "cvv",
  "ssn",
  "passport number",
  "driver license",
  "location address",
  "location zip",
] as const;

export const DEFAULT_GLINER_ENDPOINT =
  "https://api-inference.huggingface.co/models/knowledgator/gliner-pii-small-v1.0";

export function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getConfiguredLabels(): string[] {
  const configured = process.env.GLINER_PII_LABELS
    ?.split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  return configured && configured.length > 0
    ? configured
    : [...DEFAULT_PII_LABELS];
}
