DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'BankIntegrationProvider'
  ) THEN
    CREATE TYPE "BankIntegrationProvider" AS ENUM ('GENERIC');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BankConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "BankIntegrationProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL DEFAULT '',
  "accountLabel" TEXT,
  "encryptedAccessToken" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT,
  "tokenScope" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "lastCursor" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImportedBankTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "externalTransactionId" TEXT NOT NULL,
  "transactionId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "externalRaw" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImportedBankTransaction_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BankConnection_userId_fkey'
  ) THEN
    ALTER TABLE "BankConnection"
      ADD CONSTRAINT "BankConnection_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ImportedBankTransaction_userId_fkey'
  ) THEN
    ALTER TABLE "ImportedBankTransaction"
      ADD CONSTRAINT "ImportedBankTransaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ImportedBankTransaction_connectionId_fkey'
  ) THEN
    ALTER TABLE "ImportedBankTransaction"
      ADD CONSTRAINT "ImportedBankTransaction_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ImportedBankTransaction_transactionId_fkey'
  ) THEN
    ALTER TABLE "ImportedBankTransaction"
      ADD CONSTRAINT "ImportedBankTransaction_transactionId_fkey"
      FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "BankConnection_userId_provider_idx"
  ON "BankConnection"("userId", "provider");

CREATE UNIQUE INDEX IF NOT EXISTS "BankConnection_userId_provider_providerAccountId_key"
  ON "BankConnection"("userId", "provider", "providerAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS "ImportedBankTransaction_transactionId_key"
  ON "ImportedBankTransaction"("transactionId");

CREATE UNIQUE INDEX IF NOT EXISTS "ImportedBankTransaction_connectionId_externalTransactionId_key"
  ON "ImportedBankTransaction"("connectionId", "externalTransactionId");

CREATE INDEX IF NOT EXISTS "ImportedBankTransaction_userId_occurredAt_idx"
  ON "ImportedBankTransaction"("userId", "occurredAt");

CREATE INDEX IF NOT EXISTS "ImportedBankTransaction_connectionId_occurredAt_idx"
  ON "ImportedBankTransaction"("connectionId", "occurredAt");
