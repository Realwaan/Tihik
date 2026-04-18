DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    WHERE e.enumlabel = 'TRANSFER'
      AND t.typname = 'TransactionType'
  ) THEN
    ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER';
  END IF;
END $$;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "sourceAccount" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationAccount" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_userId_sourceAccount_date_idx"
  ON "Transaction"("userId", "sourceAccount", "date");

CREATE INDEX IF NOT EXISTS "Transaction_userId_destinationAccount_date_idx"
  ON "Transaction"("userId", "destinationAccount", "date");
