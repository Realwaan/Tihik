import { createServer } from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const host = process.env.BANK_MOCK_HOST ?? "127.0.0.1";
const port = Number(process.env.BANK_MOCK_PORT ?? "4010");
const expectedToken = process.env.BANK_SAMPLE_ACCESS_TOKEN ?? "sample-read-token";
const transactionsPath = process.env.BANK_API_TRANSACTIONS_PATH ?? "/transactions";

const ALL_TRANSACTIONS = [
  {
    id: "sample-tx-001",
    amount: -149.25,
    currency: "PHP",
    description: "Coffee Shop",
    date: "2026-04-17T09:00:00.000Z",
    direction: "debit",
    category: "Food",
    accountName: "Sample Checking",
  },
  {
    id: "sample-tx-002",
    amount: 5000,
    currency: "PHP",
    description: "Salary Adjustment",
    date: "2026-04-18T10:30:00.000Z",
    direction: "credit",
    category: "Salary",
    accountName: "Sample Checking",
  },
  {
    id: "sample-tx-003",
    amount: -799,
    currency: "PHP",
    description: "Utility Bill",
    date: "2026-04-19T06:45:00.000Z",
    direction: "debit",
    category: "Utilities",
    accountName: "Sample Checking",
  },
];

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function filterByDate(input, startDateText, endDateText) {
  const start = startDateText ? new Date(startDateText) : null;
  const end = endDateText ? new Date(endDateText) : null;

  return input.filter((tx) => {
    const at = new Date(tx.date);
    if (start && at < start) return false;
    if (end && at > end) return false;
    return true;
  });
}

function getPageTransactions(cursor) {
  if (cursor === "page-2") {
    return {
      transactions: [ALL_TRANSACTIONS[2]],
      nextCursor: null,
    };
  }

  return {
    transactions: [ALL_TRANSACTIONS[0], ALL_TRANSACTIONS[1]],
    nextCursor: "page-2",
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${host}:${port}`);

  if (req.method !== "GET" || url.pathname !== transactionsPath) {
    return json(res, 404, { error: "Not found" });
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token || token !== expectedToken) {
    return json(res, 401, { error: "Invalid or missing bearer token" });
  }

  const cursor = url.searchParams.get("cursor");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const paged = getPageTransactions(cursor);
  const filtered = filterByDate(paged.transactions, startDate, endDate);

  return json(res, 200, {
    transactions: filtered,
    nextCursor: paged.nextCursor,
  });
});

server.listen(port, host, () => {
  console.log("Mock bank provider started");
  console.log(`- URL: http://${host}:${port}${transactionsPath}`);
  console.log(`- Bearer token: ${expectedToken}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
