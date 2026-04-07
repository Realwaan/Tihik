import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACCOUNT_CATEGORIES = [
  "Cash",
  "GCash",
  "Maya",
  "GoTyme",
  "GrabPay",
  "ShopeePay",
  "Coins.ph",
  "PalawanPay",
  "DiskarTech",
  "BPI",
  "BDO",
  "UnionBank",
  "Landbank",
  "Metrobank",
  "RCBC",
  "Security Bank",
  "PNB",
  "Chinabank",
  "EastWest",
  "SeaBank",
  "Tonik",
  "UNO Bank",
  "KOMO",
];

async function main() {
  let totalUpdated = 0;

  for (const category of ACCOUNT_CATEGORIES) {
    const result = await prisma.transaction.updateMany({
      where: {
        sourceAccount: null,
        type: {
          in: ["INCOME", "EXPENSE"],
        },
        category,
      },
      data: {
        sourceAccount: category,
      },
    });

    totalUpdated += result.count;
  }

  console.log(`[backfill] Updated ${totalUpdated} transaction(s) with sourceAccount.`);
}

main()
  .catch((error) => {
    console.error("[backfill] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
