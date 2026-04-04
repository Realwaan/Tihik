/*
  Warnings:

  - A unique constraint covering the columns `[sourceRecurringId,recurrenceOccurrence]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "recurrenceOccurrence" TIMESTAMP(3),
ADD COLUMN     "sourceRecurringId" TEXT;

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_nextRunDate_idx" ON "RecurringTransaction"("userId", "nextRunDate");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_isActive_idx" ON "RecurringTransaction"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Transaction_sourceRecurringId_idx" ON "Transaction"("sourceRecurringId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_sourceRecurringId_recurrenceOccurrence_key" ON "Transaction"("sourceRecurringId", "recurrenceOccurrence");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceRecurringId_fkey" FOREIGN KEY ("sourceRecurringId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
