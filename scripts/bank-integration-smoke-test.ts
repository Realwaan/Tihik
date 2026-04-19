import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

import { encryptBankToken } from "../lib/bank-token-crypto";
import { prisma } from "../lib/prisma";
import { runBankTransactionsSync } from "../lib/bank-readonly";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

function ensureEnvDefaults() {
  if (!process.env.BANK_TOKEN_ENCRYPTION_KEY) {
    process.env.BANK_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    console.warn("BANK_TOKEN_ENCRYPTION_KEY was not set. Using an ephemeral test-only key for this run.");
  }

  if (!process.env.BANK_API_BASE_URL) {
    process.env.BANK_API_BASE_URL = "http://127.0.0.1:4010";
    console.warn("BANK_API_BASE_URL was not set. Defaulting to http://127.0.0.1:4010 for local smoke test.");
  }

  if (!process.env.BANK_API_TRANSACTIONS_PATH) {
    process.env.BANK_API_TRANSACTIONS_PATH = "/transactions";
  }
}

async function run() {
  ensureEnvDefaults();

  const keepData = process.env.BANK_SAMPLE_KEEP_DATA === "1";
  const sampleAccessToken = process.env.BANK_SAMPLE_ACCESS_TOKEN ?? "sample-read-token";
  const startDate = process.env.BANK_SAMPLE_START_DATE;
  const endDate = process.env.BANK_SAMPLE_END_DATE;
  const sampleEmail = `bank-smoke-${Date.now()}@trackit.local`;

  const user = await prisma.user.create({
    data: {
      email: sampleEmail,
      name: "Bank Smoke Test User",
      emailVerified: new Date(),
    },
  });

  const connection = await prisma.bankConnection.create({
    data: {
      userId: user.id,
      provider: "GENERIC",
      providerAccountId: `visa-credit-${Date.now()}`,
      accountLabel: "Visa Credit",
      encryptedAccessToken: encryptBankToken(sampleAccessToken),
      tokenScope: "transactions:read accounts:read",
    },
  });

  const first = await runBankTransactionsSync({
    userId: user.id,
    connection,
    accessToken: sampleAccessToken,
    startDate,
    endDate,
  });

  const refreshedAfterFirst = await prisma.bankConnection.findUniqueOrThrow({
    where: { id: connection.id },
  });

  const second = await runBankTransactionsSync({
    userId: user.id,
    connection: refreshedAfterFirst,
    accessToken: sampleAccessToken,
    startDate,
    endDate,
  });

  const refreshedAfterSecond = await prisma.bankConnection.findUniqueOrThrow({
    where: { id: connection.id },
  });

  const third = await runBankTransactionsSync({
    userId: user.id,
    connection: refreshedAfterSecond,
    accessToken: sampleAccessToken,
    startDate,
    endDate,
  });

  const importedRows = await prisma.importedBankTransaction.findMany({
    where: { connectionId: connection.id },
    select: {
      id: true,
      transactionId: true,
    },
  });

  const transactionIds = importedRows
    .map((row) => row.transactionId)
    .filter((value): value is string => Boolean(value));

  console.log("Bank integration smoke test completed");
  console.log(`- first sync: fetched=${first.fetched}, imported=${first.imported}`);
  console.log(`- second sync: fetched=${second.fetched}, imported=${second.imported}`);
  console.log(`- third sync: fetched=${third.fetched}, imported=${third.imported}`);
  console.log(`- total imported records in DB: ${importedRows.length}`);

  if (!keepData) {
    await prisma.importedBankTransaction.deleteMany({
      where: { connectionId: connection.id },
    });

    if (transactionIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: {
          id: {
            in: transactionIds,
          },
        },
      });
    }

    await prisma.bankConnection.delete({
      where: { id: connection.id },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log("- cleanup: completed");
  } else {
    console.log("- cleanup: skipped (BANK_SAMPLE_KEEP_DATA=1)");
    console.log(`- sample user email: ${sampleEmail}`);
    console.log(`- sample connection id: ${connection.id}`);
  }
}

run()
  .catch((error) => {
    console.error("Bank integration smoke test failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
