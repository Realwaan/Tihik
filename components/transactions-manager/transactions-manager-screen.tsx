"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Download,
  FileUp,
  Loader2,
  Plus,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";
import Skeleton from "@mui/material/Skeleton";
import { useToast } from "@/components/toast-provider";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import {
  ACCOUNT_TEMPLATE_CATEGORIES,
} from "@/lib/categories";
import { mergeCategories } from "@/lib/categories";
import { parseReceiptText } from "@/lib/receipt-parser";

import { transactionCreateSchema } from "@/lib/validations/transaction";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type Transaction = {
  id: string;
  amount: number;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: TransactionType;
  category: string;
  sourceAccount?: string | null;
  destinationAccount?: string | null;
  note?: string | null;
  date: string;
};

type TransactionFormState = {
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: TransactionType;
  category: string;
  sourceAccount: string;
  destinationAccount: string;
  note: string;
  date: string;
};

type ReceiptCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ActivityRange = "7D" | "30D" | "90D" | "ALL";

type AccountActivityDirection = "inflow" | "outflow" | "transfer";

type AccountActivityEntry = {
  transaction: Transaction;
  direction: AccountActivityDirection;
  headline: string;
  detail: string;
};

type AccountActivitySnapshot = {
  entries: AccountActivityEntry[];
  inflowCount: number;
  outflowCount: number;
  transferCount: number;
  totalMatches: number;
  lastActiveLabel: string;
  momentum: number;
  trendValues: number[];
  trendLabels: string[];
  hasHistoricalActivityOutsideRange: boolean;
};

type ReceiptPiiEntity = {
  label?: string;
  text?: string;
  score?: number | null;
};

type ReceiptPiiResponse = {
  data?: {
    redactedText?: string;
    entities?: ReceiptPiiEntity[];
    redactedCount?: number;
    warning?: string;
  };
};

const initialForm: TransactionFormState = {
  amount: "",
  currency: "USD",
  type: "EXPENSE" as const,
  category: "",
  sourceAccount: "",
  destinationAccount: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

const accountOptions = Array.from(
  new Set([...ACCOUNT_TEMPLATE_CATEGORIES])
).sort((a, b) => a.localeCompare(b));

const TRANSACTIONS_PER_PAGE = 5;

const ACTIVITY_RANGE_OPTIONS: Array<{
  value: ActivityRange;
  label: string;
}> = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
  { value: "ALL", label: "All" },
];

export function TransactionsManager() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | TransactionType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [preferredCurrency, setPreferredCurrency] =
    useState<TransactionFormState["currency"]>("USD");
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [receiptSource, setReceiptSource] = useState<string | null>(null);
  const [receiptCrop, setReceiptCrop] = useState<ReceiptCrop>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [receiptRotation, setReceiptRotation] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activityAccount, setActivityAccount] = useState("");
  const [activityRange, setActivityRange] = useState<ActivityRange>("30D");
  const [activityVisualReady, setActivityVisualReady] = useState(true);

  async function redactReceiptText(text: string) {
    try {
      const response = await fetch("/api/transactions/receipt-pii", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        return {
          text,
          redactedCount: 0,
          warning: "PII scan was unavailable. OCR parsing continued.",
        };
      }

      const json = (await response.json()) as ReceiptPiiResponse;

      return {
        text: json.data?.redactedText?.trim() || text,
        redactedCount:
          typeof json.data?.redactedCount === "number"
            ? json.data.redactedCount
            : Array.isArray(json.data?.entities)
              ? json.data.entities.length
              : 0,
        warning: json.data?.warning,
      };
    } catch {
      return {
        text,
        redactedCount: 0,
        warning: "PII scan failed. OCR parsing continued.",
      };
    }
  }

  async function loadTransactions() {
    try {
      setLoading(true);
      const response = await fetch("/api/transactions");
      const json = await response.json();
      setTransactions((json.data ?? []) as Transaction[]);
    } catch {
      const errorMsg = "Unable to load transactions.";
      setError(errorMsg);
      showToast("error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
    async function loadPreference() {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return;
        const json = await response.json();
        const currency = (json.user?.preferredCurrency ??
          "USD") as TransactionFormState["currency"];
        setPreferredCurrency(currency);
        setForm((current) => ({ ...current, currency }));
      } catch {
        // ignore preference loading errors
      }
    }
    loadPreference();
  }, []);

  useEffect(() => {
    if (form.type === "TRANSFER") {
      setAllCategories(accountOptions);
      return;
    }

    setAllCategories(
      mergeCategories(
        transactions
          .filter((item) => item.type === form.type)
          .map((item) => item.category),
        form.type === "INCOME" ? "income" : "expense"
      )
    );
  }, [transactions, form.type]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = transactionCreateSchema.safeParse({
      amount: form.amount,
      currency: preferredCurrency,
      type: form.type,
      category: form.type === "TRANSFER" ? "Transfer" : form.category,
      sourceAccount: form.sourceAccount || undefined,
      destinationAccount:
        form.type === "TRANSFER" ? form.destinationAccount || undefined : undefined,
      note: form.note || undefined,
      date: form.date,
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? "Invalid transaction data.";
      setError(errorMsg);
      showToast("error", errorMsg);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Failed to create transaction");
      }

      setForm({ ...initialForm, currency: preferredCurrency });
      showToast("success", "Transaction added successfully!");
      await loadTransactions();
    } catch {
      const errorMsg = "Could not save the transaction.";
      setError(errorMsg);
      showToast("error", errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      setTransactions((current) => current.filter((item) => item.id !== id));
      showToast("success", "Transaction deleted successfully!");
    } catch {
      const errorMsg = "Could not delete the transaction.";
      setError(errorMsg);
      showToast("error", errorMsg);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      setDuplicatingId(id);
      const response = await fetch(`/api/transactions/${id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate transaction");
      }

      showToast("success", "Transaction duplicated.");
      await loadTransactions();
    } catch {
      const errorMsg = "Could not duplicate the transaction.";
      setError(errorMsg);
      showToast("error", errorMsg);
    } finally {
      setDuplicatingId(null);
    }
  }

  function exportToCSV() {
    if (filteredTransactions.length === 0) {
      showToast("warning", "No transactions to export");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Category",
      "Source Account",
      "Destination Account",
      "Amount",
      "Currency",
      "Note",
    ];
    const rows = filteredTransactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.category,
      t.sourceAccount || "",
      t.destinationAccount || "",
      t.amount.toFixed(2),
      t.currency,
      t.note || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("success", "Transactions exported to CSV!");
  }

  function exportToPDF() {
    if (filteredTransactions.length === 0) {
      showToast("warning", "No transactions to export");
      return;
    }

    const totalIncome = filteredTransactions
      .filter((item) => item.type === "INCOME")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredTransactions
      .filter((item) => item.type === "EXPENSE")
      .reduce((sum, item) => sum + item.amount, 0);
    const netTotal = totalIncome - totalExpense;

    const rows = filteredTransactions
      .map(
        (t) => `
          <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${t.type}</td>
            <td>${escapeHtml(t.category)}</td>
            <td>${escapeHtml(t.note ?? "")}</td>
            <td class="${
              t.type === "INCOME"
                ? "amount-income"
                : t.type === "EXPENSE"
                  ? "amount-expense"
                  : "amount-transfer"
            }" style="text-align:right;">${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: t.currency,
              maximumFractionDigits: t.currency === "JPY" ? 0 : 2,
            }).format(Number(t.amount))}</td>
          </tr>
        `
      )
      .join("");

    const popup = window.open("", "_blank");
    if (!popup) {
      showToast("error", "Unable to open print preview. Please allow popups.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Transactions Export</title>
          <style>
            :root {
              --ink: #0f172a;
              --muted: #475569;
              --line: #cbd5e1;
              --surface: #f8fafc;
              --brand: #f59e0b;
            }
            * { box-sizing: border-box; }
            body {
              font-family: "Segoe UI", Arial, sans-serif;
              margin: 28px;
              color: var(--ink);
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 16px;
              border-bottom: 2px solid var(--line);
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .brand {
              margin: 0;
              font-size: 24px;
              line-height: 1.1;
            }
            .meta {
              margin: 4px 0 0;
              color: var(--muted);
              font-size: 12px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 14px;
            }
            .summary-card {
              border: 1px solid var(--line);
              border-radius: 10px;
              background: var(--surface);
              padding: 10px 12px;
            }
            .summary-card p {
              margin: 0;
              color: var(--muted);
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .summary-card h2 {
              margin: 4px 0 0;
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid var(--line);
              padding: 8px;
              vertical-align: top;
            }
            th {
              background: var(--surface);
              text-align: left;
              color: #1e293b;
            }
            .amount-income { color: #047857; font-weight: 600; }
            .amount-expense { color: #b91c1c; font-weight: 600; }
            .amount-transfer { color: #b45309; font-weight: 600; }
            .footer {
              margin-top: 12px;
              color: var(--muted);
              font-size: 11px;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand">TrackIt Statement</h1>
              <p class="meta">Generated ${new Date().toLocaleString()}</p>
            </div>
            <div style="font-size:12px; color:#64748b;">Records: ${filteredTransactions.length}</div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <p>Total Income</p>
              <h2>${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: preferredCurrency,
                maximumFractionDigits: preferredCurrency === "JPY" ? 0 : 2,
              }).format(totalIncome)}</h2>
            </div>
            <div class="summary-card">
              <p>Total Expenses</p>
              <h2>${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: preferredCurrency,
                maximumFractionDigits: preferredCurrency === "JPY" ? 0 : 2,
              }).format(totalExpense)}</h2>
            </div>
            <div class="summary-card">
              <p>Net Movement</p>
              <h2>${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: preferredCurrency,
                maximumFractionDigits: preferredCurrency === "JPY" ? 0 : 2,
              }).format(netTotal)}</h2>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="footer">TrackIt export</p>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
    popup.close();
  }

  async function handleCsvImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportingCsv(true);
      const text = await file.text();
      const rows = parseCsvRows(text);

      if (rows.length < 2) {
        showToast("warning", "CSV has no transaction rows.");
        return;
      }

      const header = rows[0].map((item) => item.trim().toLowerCase());
      const importedPayload = rows.slice(1).map((row) => {
        const get = (name: string) => {
          const index = header.indexOf(name);
          return index >= 0 ? row[index] ?? "" : "";
        };

        const amount = Number(get("amount").replace(/[^0-9.-]/g, ""));
        const currency = (get("currency") || preferredCurrency).toUpperCase();
        const type = (get("type") || "EXPENSE").toUpperCase();
        const category = get("category").trim();
        const sourceAccount = (get("source account") || get("account")).trim();
        const destinationAccount = get("destination account").trim();
        const note = get("note").trim();
        const dateRaw = get("date").trim();
        const dateValue = new Date(dateRaw);
        const date = Number.isNaN(dateValue.getTime())
          ? new Date().toISOString().slice(0, 10)
          : dateValue.toISOString().slice(0, 10);

        return {
          amount,
          currency,
          type,
          category,
          sourceAccount,
          destinationAccount,
          note,
          date,
        };
      });

      const validRows = importedPayload.filter(
        (row) => {
          if (!Number.isFinite(row.amount)) {
            return false;
          }

          if (!["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"].includes(row.currency)) {
            return false;
          }

          if (!["INCOME", "EXPENSE", "TRANSFER"].includes(row.type)) {
            return false;
          }

          if (row.amount < 0) {
            return false;
          }

          if (row.type === "TRANSFER") {
            return (
              row.amount > 0 &&
              row.sourceAccount.length > 0 &&
              row.destinationAccount.length > 0 &&
              row.sourceAccount.toLowerCase() !== row.destinationAccount.toLowerCase()
            );
          }

          if (row.amount > 0) {
            return row.category.length > 0;
          }

          const date = new Date(row.date);
          if (Number.isNaN(date.getTime())) {
            return false;
          }

          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return dateStart > todayStart && row.category.length > 0;
        }
      );

      if (validRows.length === 0) {
        showToast("warning", "No valid rows found in CSV.");
        return;
      }

      const responses = await Promise.all(
        validRows.map((row) =>
          fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: row.amount,
              currency: row.currency,
              type: row.type,
              category: row.type === "TRANSFER" ? "Transfer" : row.category,
              sourceAccount: row.sourceAccount || undefined,
              destinationAccount:
                row.type === "TRANSFER" ? row.destinationAccount || undefined : undefined,
              note: row.note || undefined,
              date: row.date,
            }),
          })
        )
      );

      const failedRows = responses.filter((response) => !response.ok).length;
      const importedCount = responses.length - failedRows;

      if (importedCount === 0) {
        showToast("error", "CSV import failed. No rows were saved.");
        return;
      }

      if (failedRows > 0) {
        showToast(
          "warning",
          `Imported ${importedCount} row${importedCount === 1 ? "" : "s"}; ${failedRows} failed.`
        );
      } else {
        showToast(
          "success",
          `Imported ${importedCount} transaction${importedCount === 1 ? "" : "s"} from CSV.`
        );
      }

      await loadTransactions();
    } catch {
      showToast("error", "CSV import failed. Please verify file format.");
    } finally {
      setImportingCsv(false);
      event.target.value = "";
    }
  }

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (form.type !== "EXPENSE") {
      showToast("warning", "Receipt scanner is available for expenses.");
      event.target.value = "";
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setReceiptSource(imageDataUrl);
      setReceiptCrop({ x: 0, y: 0, width: 100, height: 100 });
      setReceiptRotation(0);
      showToast("success", "Receipt loaded. Adjust crop/rotation, then analyze.");
    } catch {
      showToast("error", "Receipt load failed. Please try another image.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleAnalyzeReceipt() {
    if (!receiptSource) {
      showToast("warning", "Upload a receipt image first.");
      return;
    }

    try {
      setScanningReceipt(true);
      const [{ createWorker }, imageDataUrl] = await Promise.all([
        import("tesseract.js"),
        buildReceiptImageDataUrl(receiptSource, receiptCrop, receiptRotation),
      ]);

      const worker = await createWorker("eng");
      const { data } = await worker.recognize(imageDataUrl);
      await worker.terminate();

      const piiScan = await redactReceiptText(data.text || "");

      if (piiScan.warning) {
        showToast("warning", piiScan.warning);
      }

      const parsed = parseReceiptText(piiScan.text, form.currency);
      const merchantLabel =
        parsed.merchant && !parsed.merchant.includes("REDACTED")
          ? parsed.merchant
          : undefined;

      setForm((current) => ({
        ...current,
        amount: parsed.amount ? parsed.amount.toFixed(2) : current.amount,
        category: parsed.category ?? current.category,
        date: parsed.date ?? current.date,
        note:
          merchantLabel && !current.note
            ? `Receipt: ${merchantLabel}`
            : current.note,
      }));

      showToast(
        "success",
        `Receipt analyzed.${
          piiScan.redactedCount > 0
            ? ` ${piiScan.redactedCount} sensitive value${piiScan.redactedCount === 1 ? "" : "s"} redacted.`
            : ""
        } Please review detected fields.`
      );
    } catch {
      showToast("error", "Receipt analysis failed. Please enter details manually.");
    } finally {
      setScanningReceipt(false);
    }
  }

  useEffect(() => {
    const trimmedNote = form.note.trim();
    if (form.type === "TRANSFER" || !trimmedNote || form.category.trim()) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setSuggestingCategory(true);
        const response = await fetch(
          `/api/transactions/suggest-category?note=${encodeURIComponent(
            trimmedNote
          )}&type=${form.type}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          return;
        }
        const json = await response.json();
        const suggested = json.data?.category as string | null | undefined;
        if (suggested) {
          setForm((current) =>
            current.category.trim() ? current : { ...current, category: suggested }
          );
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // ignore suggestion failures
        }
      } finally {
        setSuggestingCategory(false);
      }
    }, 450);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.note, form.type, form.category]);

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!previewRef.current) return;
    const point = getPointerPercent(event, previewRef.current);
    setDragStart(point);
    setReceiptCrop({ x: point.x, y: point.y, width: 10, height: 10 });
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!previewRef.current || !dragStart) return;
    const current = getPointerPercent(event, previewRef.current);
    const x = Math.min(dragStart.x, current.x);
    const y = Math.min(dragStart.y, current.y);
    const width = Math.max(10, Math.abs(current.x - dragStart.x));
    const height = Math.max(10, Math.abs(current.y - dragStart.y));
    setReceiptCrop({
      x: clampPercent(x),
      y: clampPercent(y),
      width: clampPercent(Math.min(width, 100 - x)),
      height: clampPercent(Math.min(height, 100 - y)),
    });
  }

  function handleCropPointerUp() {
    setDragStart(null);
  }

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch =
        t.category.toLowerCase().includes(normalizedSearch) ||
        (t.note?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (t.sourceAccount?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (t.destinationAccount?.toLowerCase().includes(normalizedSearch) ?? false) ||
        t.amount.toString().includes(normalizedSearch);

      const matchesType = filterType === "ALL" || t.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, filterType]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE)
  );

  const pagedTransactions = useMemo(() => {
    const start = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    return filteredTransactions.slice(start, start + TRANSACTIONS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const pageStartIndex =
    filteredTransactions.length === 0
      ? 0
      : (currentPage - 1) * TRANSACTIONS_PER_PAGE + 1;
  const pageEndIndex =
    filteredTransactions.length === 0
      ? 0
      : Math.min(currentPage * TRANSACTIONS_PER_PAGE, filteredTransactions.length);

  const selectedTransactionAccounts = useMemo(
    () => getTransactionAccounts(selectedTransaction),
    [selectedTransaction]
  );

  const accountActivity = useMemo(() => {
    if (!activityAccount.trim()) {
      return {
        entries: [],
        inflowCount: 0,
        outflowCount: 0,
        transferCount: 0,
        totalMatches: 0,
        lastActiveLabel: "No linked activity",
        momentum: 0,
        trendValues: [],
        trendLabels: [],
        hasHistoricalActivityOutsideRange: false,
      } satisfies AccountActivitySnapshot;
    }

    return buildAccountActivitySnapshot(transactions, activityAccount, activityRange);
  }, [transactions, activityAccount, activityRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  useEffect(() => {
    setCurrentPage((previous) => {
      if (filteredTransactions.length === 0) {
        return 1;
      }

      return Math.min(previous, totalPages);
    });
  }, [filteredTransactions.length, totalPages]);

  useEffect(() => {
    if (!selectedTransaction) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTransaction(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedTransaction]);

  useEffect(() => {
    if (selectedTransactionAccounts.length === 0) {
      setActivityAccount("");
      return;
    }

    setActivityAccount((current) => {
      const normalizedCurrent = current.trim().toLowerCase();
      if (
        normalizedCurrent &&
        selectedTransactionAccounts.some(
          (account) => account.toLowerCase() === normalizedCurrent
        )
      ) {
        return current;
      }
      return selectedTransactionAccounts[0];
    });
  }, [selectedTransactionAccounts]);

  useEffect(() => {
    setActivityVisualReady(false);
    const timeoutId = window.setTimeout(() => {
      setActivityVisualReady(true);
    }, 55);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activityRange, activityAccount, selectedTransaction?.id]);

  function renderTransactionRow(transaction: Transaction, compact = false) {
    return (
      <article
        key={transaction.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedTransaction(transaction)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedTransaction(transaction);
          }
        }}
        className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 transition-colors hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-blue-800 dark:hover:bg-blue-900/20 ${
          compact ? "px-3 py-3" : "px-4 py-4"
        }`}
        aria-label={`View details for ${transaction.category} ${transaction.type.toLowerCase()} transaction`}
      >
        <div>
          <div className="flex items-center gap-3">
            <p className="font-medium text-slate-900 dark:text-slate-100">{transaction.category}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                transaction.type === "INCOME"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : transaction.type === "EXPENSE"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {transaction.type}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {getTransactionSummary(transaction)}
          </p>
        </div>
        <div className={`flex items-center ${compact ? "gap-2" : "gap-4"}`}>
          <p
            className={`text-sm font-semibold ${
              transaction.type === "INCOME"
                ? "text-emerald-700 dark:text-emerald-400"
                : transaction.type === "EXPENSE"
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {transaction.type === "INCOME"
              ? "+"
              : transaction.type === "EXPENSE"
                ? "-"
                : "↔ "}
            {formatTransactionAmount(transaction)}
          </p>
          <button
            type="button"
            disabled={duplicatingId === transaction.id}
            onClick={(event) => {
              event.stopPropagation();
              handleDuplicate(transaction.id);
            }}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:border-amber-800 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
            aria-label="Duplicate transaction"
          >
            {duplicatingId === transaction.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(transaction.id);
            }}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            aria-label="Delete transaction"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add transaction</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quickly log income, expenses, and transfers.</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
            {preferredCurrency} profile currency
          </span>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="0.00"
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as TransactionType,
                    category:
                      event.target.value === "TRANSFER"
                        ? "Transfer"
                        : current.category,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={form.type === "TRANSFER" ? "From account" : "Account"}>
              <CategoryCombobox
                value={form.sourceAccount}
                onChange={(value) =>
                  setForm((current) => ({ ...current, sourceAccount: value }))
                }
                options={accountOptions}
                placeholder="Cash, GCash, BPI..."
              />
            </Field>

            {form.type === "TRANSFER" ? (
              <Field label="To account">
                <CategoryCombobox
                  value={form.destinationAccount}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, destinationAccount: value }))
                  }
                  options={accountOptions}
                  placeholder="Cash, Maya, UnionBank..."
                />
              </Field>
            ) : null}
          </div>

          {form.type === "TRANSFER" ? (
            <Field label="Category">
              <input
                value="Transfer"
                readOnly
                className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
            </Field>
          ) : (
            <Field label="Category">
              <CategoryCombobox
                value={form.category}
                onChange={(value) =>
                  setForm((current) => ({ ...current, category: value }))
                }
                options={allCategories}
                placeholder="Food, Rent, Salary..."
              />
              {suggestingCategory ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Suggesting category from note...
                </p>
              ) : null}
            </Field>
          )}

          {form.type === "EXPENSE" ? (
            <details className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/40">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-700 dark:text-slate-300">
                Optional tools
                <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                  receipt scanner
                </span>
              </summary>
              <div className="mt-4 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  disabled={scanningReceipt}
                  className="block w-full cursor-pointer rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:file:bg-slate-100 dark:file:text-slate-900 dark:hover:file:bg-slate-200"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload receipt, adjust crop/rotation, then analyze to auto-fill fields.
                </p>
                {receiptSource ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                    <div
                      ref={previewRef}
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                      className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                      style={{ touchAction: "none" }}
                    >
                      <img
                        src={receiptSource}
                        alt="Receipt preview"
                        className="max-h-64 w-full object-contain bg-slate-50 dark:bg-slate-900"
                      />
                      <div
                        className="pointer-events-none absolute border-2 border-amber-500 bg-amber-300/15"
                        style={{
                          left: `${receiptCrop.x}%`,
                          top: `${receiptCrop.y}%`,
                          width: `${receiptCrop.width}%`,
                          height: `${receiptCrop.height}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Drag on preview to select crop area. Rotation applies during OCR.
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <RangeControl
                        label={`Crop X (${receiptCrop.x}%)`}
                        value={receiptCrop.x}
                        onChange={(value) =>
                          setReceiptCrop((current) => ({
                            ...current,
                            x: Math.min(value, 100 - current.width),
                          }))
                        }
                        max={100}
                      />
                      <RangeControl
                        label={`Crop Y (${receiptCrop.y}%)`}
                        value={receiptCrop.y}
                        onChange={(value) =>
                          setReceiptCrop((current) => ({
                            ...current,
                            y: Math.min(value, 100 - current.height),
                          }))
                        }
                        max={100}
                      />
                      <RangeControl
                        label={`Crop Width (${receiptCrop.width}%)`}
                        value={receiptCrop.width}
                        onChange={(value) =>
                          setReceiptCrop((current) => ({
                            ...current,
                            width: Math.max(10, Math.min(value, 100 - current.x)),
                          }))
                        }
                        min={10}
                        max={100}
                      />
                      <RangeControl
                        label={`Crop Height (${receiptCrop.height}%)`}
                        value={receiptCrop.height}
                        onChange={(value) =>
                          setReceiptCrop((current) => ({
                            ...current,
                            height: Math.max(10, Math.min(value, 100 - current.y)),
                          }))
                        }
                        min={10}
                        max={100}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReceiptRotation((current) => (current + 270) % 360)}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Rotate Left
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptRotation((current) => (current + 90) % 360)}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Rotate Right
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyzeReceipt}
                        disabled={scanningReceipt}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        {scanningReceipt ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Analyze receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptSource(null)}
                        className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
                {scanningReceipt ? (
                  <p className="inline-flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scanning receipt...
                  </p>
                ) : null}
              </div>
            </details>
          ) : null}

          <Field label="Note">
            <textarea
              rows={3}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
               className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Optional note"
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
             className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Field>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save transaction
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent transactions</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sorted by newest first.</p>
          </div>
          <details className="group rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/40">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-700 dark:text-slate-300">
              More actions
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                import or export
              </span>
            </summary>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {transactions.length > 0 ? (
                <>
                  <button
                    onClick={exportToCSV}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                </>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 motion-reduce:transition-none">
                <FileUp className="h-4 w-4" />
                {importingCsv ? "Importing..." : "Import CSV"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvImport}
                  disabled={importingCsv}
                  className="hidden"
                />
              </label>
            </div>
          </details>
        </div>

        {transactions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    filterType === "ALL"
                      ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType("INCOME")}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    filterType === "INCOME"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() => setFilterType("EXPENSE")}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    filterType === "EXPENSE"
                      ? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setFilterType("TRANSFER")}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    filterType === "TRANSFER"
                      ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rounded"
                  animation="wave"
                  height={64}
                  className="rounded-2xl"
                />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {searchQuery || filterType !== "ALL" 
                ? "No transactions match your filters." 
                : "No transactions yet. Add your first one on the left."}
            </div>
          ) : (
            <div className="space-y-3">
              {pagedTransactions.map((transaction) => renderTransactionRow(transaction))}
              {filteredTransactions.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 sm:text-left">
                    Showing {pageStartIndex}-{pageEndIndex} of {filteredTransactions.length} transactions.
                  </p>
                  {totalPages > 1 ? (
                    <div className="inline-flex items-center justify-center gap-2 self-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((previous) => Math.max(1, previous - 1))
                        }
                        disabled={currentPage === 1}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((previous) =>
                            Math.min(totalPages, previous + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {selectedTransaction ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close transaction details"
            onClick={() => setSelectedTransaction(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-details-title"
            className="relative z-10 max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[88vh] sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Transaction details
                </p>
                <h3 id="transaction-details-title" className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTransaction.category}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                What was this for?
              </p>
              <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">
                {getTransactionPurpose(selectedTransaction)}
              </p>
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Account activity
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                      {activityAccount || "No account linked"}
                    </h4>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                    {accountActivity.totalMatches} records | {getActivityRangeLabel(activityRange)}
                  </span>
                </div>

                {selectedTransactionAccounts.length > 1 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTransactionAccounts.map((account) => {
                      const isActive =
                        account.toLowerCase() === activityAccount.trim().toLowerCase();

                      return (
                        <button
                          key={account}
                          type="button"
                          onClick={() => setActivityAccount(account)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                              : "border-slate-200 bg-white/80 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          {account}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {activityAccount ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ACTIVITY_RANGE_OPTIONS.map((rangeOption) => {
                      const isActive = rangeOption.value === activityRange;
                      return (
                        <button
                          key={rangeOption.value}
                          type="button"
                          onClick={() => setActivityRange(rangeOption.value)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                              : "border-slate-200 bg-white/80 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                          aria-label={`Show account activity for ${rangeOption.label}`}
                        >
                          {rangeOption.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {activityAccount ? (
                  <>
                    <div
                      key={`activity-pulse-${activityAccount}-${activityRange}`}
                      className={`mt-4 rounded-2xl border border-slate-200 bg-white/75 p-3 transition-all duration-300 dark:border-slate-700 dark:bg-slate-900/60 ${
                        activityVisualReady
                          ? "translate-y-0 opacity-100"
                          : "-translate-y-1 opacity-0"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Activity pulse
                        </p>
                        <span
                          className={`text-xs font-semibold ${
                            accountActivity.momentum >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {accountActivity.momentum >= 0 ? "+" : ""}
                          {accountActivity.momentum} momentum
                        </span>
                      </div>
                      <AccountActivitySparkline values={accountActivity.trendValues} />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{accountActivity.trendLabels[0] || "Start"}</span>
                        <span>
                          {accountActivity.trendLabels[accountActivity.trendLabels.length - 1] ||
                            "Now"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Inflow events</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {accountActivity.inflowCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Outflow events</p>
                        <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-300">
                          {accountActivity.outflowCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transfers</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {accountActivity.transferCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70 sm:col-span-2 lg:col-span-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last active</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {accountActivity.lastActiveLabel}
                        </p>
                      </div>
                    </div>

                    {accountActivity.entries.length > 1 ? (
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 sm:hidden">
                        Swipe to browse timeline cards.
                      </p>
                    ) : null}

                    <div className="mt-4">
                      {accountActivity.entries.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                          {accountActivity.hasHistoricalActivityOutsideRange
                            ? "No activity found in this time range. Try 90D or All."
                            : "No account activity found yet."}
                        </div>
                      ) : (
                        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
                          <div className="flex snap-x gap-2 sm:block sm:space-y-2">
                            {accountActivity.entries.map((entry, index) => (
                              <article
                                key={`activity-${entry.transaction.id}`}
                                className={`flex min-w-[86%] snap-start items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-900/50 sm:min-w-0 ${
                                  activityVisualReady
                                    ? "translate-y-0 opacity-100"
                                    : "translate-y-1 opacity-0"
                                }`}
                                style={{
                                  transitionDelay: activityVisualReady
                                    ? `${Math.min(index, 5) * 45}ms`
                                    : "0ms",
                                }}
                              >
                                <span
                                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                    entry.direction === "inflow"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : entry.direction === "outflow"
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                  }`}
                                >
                                  {entry.direction === "inflow" ? (
                                    <ArrowDownLeft className="h-4 w-4" />
                                  ) : entry.direction === "outflow" ? (
                                    <ArrowUpRight className="h-4 w-4" />
                                  ) : (
                                    <Repeat2 className="h-4 w-4" />
                                  )}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                      {entry.headline}
                                    </p>
                                    <p
                                      className={`text-xs font-semibold ${
                                        entry.direction === "inflow"
                                          ? "text-emerald-700 dark:text-emerald-300"
                                          : entry.direction === "outflow"
                                            ? "text-rose-700 dark:text-rose-300"
                                            : "text-amber-700 dark:text-amber-300"
                                      }`}
                                    >
                                      {entry.direction === "inflow"
                                        ? "+"
                                        : entry.direction === "outflow"
                                          ? "-"
                                          : "↔ "}
                                      {formatTransactionAmount(entry.transaction)}
                                    </p>
                                  </div>
                                  <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                                    {entry.detail}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {formatTransactionDate(entry.transaction.date, true)}
                                  </p>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    Add a source or destination account to this transaction to unlock account activity insights.
                  </div>
                )}
              </div>
            </section>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/20">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</dt>
                <dd className={`mt-1 text-sm font-semibold ${
                  selectedTransaction.type === "INCOME"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : selectedTransaction.type === "EXPENSE"
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-amber-700 dark:text-amber-300"
                }`}>
                  {selectedTransaction.type}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/20">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTransaction.type === "INCOME"
                    ? "+"
                    : selectedTransaction.type === "EXPENSE"
                      ? "-"
                      : "↔ "}
                  {formatTransactionAmount(selectedTransaction)}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/20">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatTransactionDate(selectedTransaction.date, true)}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/20">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Source account</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {selectedTransaction.sourceAccount?.trim() || "Not provided"}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/20">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Destination account</dt>
                <dd className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {selectedTransaction.destinationAccount?.trim() || "Not provided"}
                </dd>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/20">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Transaction ID</dt>
                <dd className="mt-1 break-all text-xs font-medium text-slate-600 dark:text-slate-300">
                  {selectedTransaction.id}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function formatTransactionAmount(transaction: Transaction) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency,
    maximumFractionDigits: transaction.currency === "JPY" ? 0 : 2,
  }).format(Number(transaction.amount));
}

function formatTransactionDate(value: string, withTime = false) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }

  if (withTime) {
    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTransactionSummary(transaction: Transaction) {
  if (transaction.type === "TRANSFER") {
    return (
      transaction.note?.trim() ||
      `${transaction.sourceAccount || "Unknown"} to ${transaction.destinationAccount || "Unknown"}`
    );
  }

  return transaction.note?.trim() || formatTransactionDate(transaction.date);
}

function getTransactionPurpose(transaction: Transaction) {
  if (transaction.note?.trim()) {
    return transaction.note.trim();
  }

  if (transaction.type === "TRANSFER") {
    const from = transaction.sourceAccount?.trim() || "Unknown account";
    const to = transaction.destinationAccount?.trim() || "Unknown account";
    return `Transfer from ${from} to ${to}.`;
  }

  return `${transaction.type === "INCOME" ? "Income" : "Expense"} recorded under ${
    transaction.category
  }.`;
}

function getTransactionAccounts(transaction: Transaction | null): string[] {
  if (!transaction) {
    return [];
  }

  const accountMap = new Map<string, string>();
  [transaction.sourceAccount, transaction.destinationAccount].forEach((value) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return;
    }

    const key = trimmed.toLowerCase();
    if (!accountMap.has(key)) {
      accountMap.set(key, trimmed);
    }
  });

  return Array.from(accountMap.values());
}

function buildAccountActivitySnapshot(
  transactions: Transaction[],
  account: string,
  activityRange: ActivityRange
): AccountActivitySnapshot {
  const normalizedAccount = account.trim().toLowerCase();
  if (!normalizedAccount) {
    return {
      entries: [],
      inflowCount: 0,
      outflowCount: 0,
      transferCount: 0,
      totalMatches: 0,
      lastActiveLabel: "No linked activity",
      momentum: 0,
      trendValues: [],
      trendLabels: [],
      hasHistoricalActivityOutsideRange: false,
    };
  }

  const matchedAll = transactions
    .filter(
      (transaction) =>
        matchesAccount(transaction.sourceAccount, normalizedAccount) ||
        matchesAccount(transaction.destinationAccount, normalizedAccount)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const rangeStart = getActivityRangeStart(activityRange);
  const matched = rangeStart
    ? matchedAll.filter((transaction) => {
        const date = new Date(transaction.date);
        if (Number.isNaN(date.getTime())) {
          return false;
        }
        return date >= rangeStart;
      })
    : matchedAll;

  const hasHistoricalActivityOutsideRange =
    matchedAll.length > 0 && matched.length < matchedAll.length;

  if (matched.length === 0) {
    return {
      entries: [],
      inflowCount: 0,
      outflowCount: 0,
      transferCount: 0,
      totalMatches: 0,
      lastActiveLabel:
        matchedAll.length > 0
          ? `No activity in ${getActivityRangeLabel(activityRange)}`
          : "No activity yet",
      momentum: 0,
      trendValues: [],
      trendLabels: [],
      hasHistoricalActivityOutsideRange,
    };
  }

  let inflowCount = 0;
  let outflowCount = 0;
  let transferCount = 0;

  const allEntries = matched.map((transaction) => {
    const descriptor = describeAccountActivity(transaction, normalizedAccount);
    if (descriptor.direction === "inflow") {
      inflowCount += 1;
    } else if (descriptor.direction === "outflow") {
      outflowCount += 1;
    } else {
      transferCount += 1;
    }

    return {
      transaction,
      ...descriptor,
    };
  });

  const trendSource = allEntries.slice(0, 12).reverse();
  let runningMomentum = 0;
  const trendValues = trendSource.map((entry) => {
    if (entry.direction === "inflow") {
      runningMomentum += 1;
    } else if (entry.direction === "outflow") {
      runningMomentum -= 1;
    }
    return runningMomentum;
  });

  const trendLabels = trendSource.map((entry) =>
    formatTransactionDate(entry.transaction.date)
  );

  return {
    entries: allEntries.slice(0, 6),
    inflowCount,
    outflowCount,
    transferCount,
    totalMatches: matched.length,
    lastActiveLabel: formatTransactionDate(matched[0].date, true),
    momentum: inflowCount - outflowCount,
    trendValues,
    trendLabels,
    hasHistoricalActivityOutsideRange,
  };
}

function getActivityRangeStart(range: ActivityRange): Date | null {
  const days =
    range === "7D" ? 7 : range === "30D" ? 30 : range === "90D" ? 90 : null;
  if (!days) {
    return null;
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function getActivityRangeLabel(range: ActivityRange): string {
  if (range === "ALL") {
    return "All time";
  }

  return `Last ${range.toLowerCase()}`;
}

function matchesAccount(
  account: string | null | undefined,
  normalizedAccount: string
): boolean {
  return account?.trim().toLowerCase() === normalizedAccount;
}

function describeAccountActivity(
  transaction: Transaction,
  normalizedAccount: string
): Omit<AccountActivityEntry, "transaction"> {
  const source = transaction.sourceAccount?.trim() || "Unknown account";
  const destination = transaction.destinationAccount?.trim() || "Unknown account";
  const sourceMatches = matchesAccount(transaction.sourceAccount, normalizedAccount);
  const destinationMatches = matchesAccount(
    transaction.destinationAccount,
    normalizedAccount
  );

  if (transaction.type === "TRANSFER") {
    if (sourceMatches && !destinationMatches) {
      return {
        direction: "outflow",
        headline: "Transfer sent",
        detail: `Moved to ${destination}`,
      };
    }

    if (destinationMatches && !sourceMatches) {
      return {
        direction: "inflow",
        headline: "Transfer received",
        detail: `Received from ${source}`,
      };
    }

    return {
      direction: "transfer",
      headline: "Internal transfer",
      detail: `${source} to ${destination}`,
    };
  }

  if (transaction.type === "INCOME") {
    return {
      direction: "inflow",
      headline: "Income recorded",
      detail: transaction.note?.trim() || transaction.category,
    };
  }

  return {
    direction: "outflow",
    headline: "Expense recorded",
    detail: transaction.note?.trim() || transaction.category,
  };
}

function AccountActivitySparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-4 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
        Not enough activity for a trend yet.
      </div>
    );
  }

  const coordinates = buildSparklineCoordinates(values);
  const min = Math.min(...coordinates.map((point) => point.value));
  const max = Math.max(...coordinates.map((point) => point.value));
  const range = max - min || 1;
  const zeroY = clampPercent(100 - ((0 - min) / range) * 100);
  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${coordinates[0].x} 100 ${coordinates
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ")} L ${coordinates[coordinates.length - 1].x} 100 Z`;

  return (
    <div className="mt-2 h-20 w-full overflow-hidden rounded-xl border border-slate-200 bg-white/85 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/60">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="activity-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(14 165 233 / 0.35)" />
            <stop offset="100%" stopColor="rgb(14 165 233 / 0)" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          x2="100"
          y1={zeroY}
          y2={zeroY}
          stroke="rgb(148 163 184 / 0.45)"
          strokeDasharray="3 3"
        />
        <path d={areaPath} fill="url(#activity-trend-fill)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="rgb(14 165 233)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function buildSparklineCoordinates(values: number[]) {
  const safeValues = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;

  return safeValues.map((value, index) => {
    const denominator = safeValues.length - 1 || 1;
    const x = (index / denominator) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { x, y, value };
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read receipt file"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPointerPercent(
  event: React.PointerEvent<HTMLDivElement>,
  element: HTMLDivElement
) {
  const rect = element.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return {
    x: clampPercent(x),
    y: clampPercent(y),
  };
}

async function buildReceiptImageDataUrl(
  source: string,
  crop: ReceiptCrop,
  rotation: number
): Promise<string> {
  const image = await loadImage(source);
  const sx = Math.round((crop.x / 100) * image.width);
  const sy = Math.round((crop.y / 100) * image.height);
  const sw = Math.max(1, Math.round((crop.width / 100) * image.width));
  const sh = Math.max(1, Math.round((crop.height / 100) * image.height));

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const swap = normalizedRotation === 90 || normalizedRotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? sh : sw;
  canvas.height = swap ? sw : sh;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create canvas context");
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((normalizedRotation * Math.PI) / 180);
  context.drawImage(image, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);

  return canvas.toDataURL("image/png");
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = source;
  });
}

function RangeControl({
  label,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
      <span className="mb-1 block">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-500"
      />
    </label>
  );
}
