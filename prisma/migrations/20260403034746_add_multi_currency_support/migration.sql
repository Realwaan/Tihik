-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD');

-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "SharedExpense" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';
