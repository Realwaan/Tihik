DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InstallmentStatus'
  ) THEN
    CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InstallmentAccountType'
  ) THEN
    CREATE TYPE "InstallmentAccountType" AS ENUM ('DEBIT', 'CREDIT');
  END IF;
END $$;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "sourceInstallmentId" TEXT;

CREATE TABLE IF NOT EXISTS "InstallmentPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "totalInstallments" INTEGER NOT NULL,
  "paidInstallments" INTEGER NOT NULL DEFAULT 0,
  "installmentAmount" DOUBLE PRECISION NOT NULL,
  "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY',
  "interval" INTEGER NOT NULL DEFAULT 1,
  "startDate" TIMESTAMP(3) NOT NULL,
  "nextDueDate" TIMESTAMP(3) NOT NULL,
  "sourceAccount" TEXT,
  "accountType" "InstallmentAccountType" NOT NULL DEFAULT 'DEBIT',
  "note" TEXT,
  "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastPaymentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InstallmentPayment" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "installmentsCovered" INTEGER NOT NULL DEFAULT 1,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "sourceAccount" TEXT,
  "note" TEXT,
  "linkedTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstallmentPayment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InstallmentPlan_userId_fkey'
  ) THEN
    ALTER TABLE "InstallmentPlan"
      ADD CONSTRAINT "InstallmentPlan_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InstallmentPayment_planId_fkey'
  ) THEN
    ALTER TABLE "InstallmentPayment"
      ADD CONSTRAINT "InstallmentPayment_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InstallmentPayment_userId_fkey'
  ) THEN
    ALTER TABLE "InstallmentPayment"
      ADD CONSTRAINT "InstallmentPayment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InstallmentPayment_linkedTransactionId_fkey'
  ) THEN
    ALTER TABLE "InstallmentPayment"
      ADD CONSTRAINT "InstallmentPayment_linkedTransactionId_fkey"
      FOREIGN KEY ("linkedTransactionId") REFERENCES "Transaction"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_sourceInstallmentId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_sourceInstallmentId_fkey"
      FOREIGN KEY ("sourceInstallmentId") REFERENCES "InstallmentPlan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "InstallmentPayment_linkedTransactionId_key"
  ON "InstallmentPayment"("linkedTransactionId");

CREATE INDEX IF NOT EXISTS "InstallmentPlan_userId_status_nextDueDate_idx"
  ON "InstallmentPlan"("userId", "status", "nextDueDate");

CREATE INDEX IF NOT EXISTS "InstallmentPlan_userId_sourceAccount_idx"
  ON "InstallmentPlan"("userId", "sourceAccount");

CREATE INDEX IF NOT EXISTS "InstallmentPayment_userId_paidAt_idx"
  ON "InstallmentPayment"("userId", "paidAt");

CREATE INDEX IF NOT EXISTS "InstallmentPayment_planId_paidAt_idx"
  ON "InstallmentPayment"("planId", "paidAt");

CREATE INDEX IF NOT EXISTS "Transaction_sourceInstallmentId_idx"
  ON "Transaction"("sourceInstallmentId");
