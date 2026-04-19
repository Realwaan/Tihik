import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const errors = [];
const warnings = [];

const encryptionKey = (process.env.BANK_TOKEN_ENCRYPTION_KEY ?? "").trim();
const baseUrlText = (process.env.BANK_API_BASE_URL ?? "").trim();
const transactionsPath = (process.env.BANK_API_TRANSACTIONS_PATH ?? "/transactions").trim();
const databaseUrl = (process.env.DATABASE_URL ?? "").trim();

if (!encryptionKey) {
  errors.push("BANK_TOKEN_ENCRYPTION_KEY is missing.");
} else if (encryptionKey.length < 32) {
  warnings.push("BANK_TOKEN_ENCRYPTION_KEY is shorter than 32 characters. Use a longer secret in production.");
}

if (!baseUrlText) {
  errors.push("BANK_API_BASE_URL is missing.");
} else {
  try {
    const parsed = new URL(baseUrlText);
    if (!parsed.protocol.startsWith("http")) {
      errors.push("BANK_API_BASE_URL must use http:// or https://");
    }
  } catch {
    errors.push("BANK_API_BASE_URL is not a valid URL.");
  }
}

if (!transactionsPath.startsWith("/")) {
  errors.push("BANK_API_TRANSACTIONS_PATH must start with '/'.");
}

if (!databaseUrl) {
  errors.push("DATABASE_URL is missing (required for saving bank connections/imported transactions).");
}

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
  console.log("");
}

if (errors.length > 0) {
  console.error("Bank env check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("\nFix the values in .env.local/.env and rerun: npm run bank:env:check");
  process.exit(1);
}

console.log("Bank env check passed.");
console.log(`- BANK_API_BASE_URL host: ${new URL(baseUrlText).host}`);
console.log(`- BANK_API_TRANSACTIONS_PATH: ${transactionsPath}`);
console.log("- DATABASE_URL: configured");
