"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Download, FileUp } from "lucide-react";
import Skeleton from "@mui/material/Skeleton";
import { useToast } from "@/components/toast-provider";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { mergeCategories } from "@/lib/categories";
import { parseReceiptText } from "@/lib/receipt-parser";

import { transactionCreateSchema } from "@/lib/validations/transaction";

type Transaction = {
  id: string;
  amount: number;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: "INCOME" | "EXPENSE";
  category: string;
  note?: string | null;
  date: string;
};

type TransactionFormState = {
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "PHP";
  type: "INCOME" | "EXPENSE";
  category: string;
  note: string;
  date: string;
};

type ReceiptCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const initialForm: TransactionFormState = {
  amount: "",
  currency: "USD",
  type: "EXPENSE" as const,
  category: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

export function TransactionsManager() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TransactionFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
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
      category: form.category,
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

  function exportToCSV() {
    if (transactions.length === 0) {
      showToast("warning", "No transactions to export");
      return;
    }

    // Create CSV content
    const headers = ["Date", "Type", "Category", "Amount", "Currency", "Note"];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.category,
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

    const rows = filteredTransactions
      .map(
        (t) => `
          <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${t.type}</td>
            <td>${escapeHtml(t.category)}</td>
            <td>${escapeHtml(t.note ?? "")}</td>
            <td style="text-align:right;">${new Intl.NumberFormat("en-US", {
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
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 12px; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>TrackIt Transactions</h1>
          <p>Generated ${new Date().toLocaleString()}</p>
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
          note,
          date,
        };
      });

      const validRows = importedPayload.filter(
        (row) =>
          Number.isFinite(row.amount) &&
          row.amount > 0 &&
          ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "PHP"].includes(row.currency) &&
          ["INCOME", "EXPENSE"].includes(row.type) &&
          row.category.length > 0
      );

      if (validRows.length === 0) {
        showToast("warning", "No valid rows found in CSV.");
        return;
      }

      await Promise.all(
        validRows.map((row) =>
          fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: row.amount,
              currency: row.currency,
              type: row.type,
              category: row.category,
              note: row.note || undefined,
              date: row.date,
            }),
          })
        )
      );

      showToast(
        "success",
        `Imported ${validRows.length} transaction${validRows.length === 1 ? "" : "s"} from CSV.`
      );
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

      const parsed = parseReceiptText(data.text, form.currency);
      setForm((current) => ({
        ...current,
        amount: parsed.amount ? parsed.amount.toFixed(2) : current.amount,
        category: parsed.category ?? current.category,
        date: parsed.date ?? current.date,
        note:
          parsed.merchant && !current.note
            ? `Receipt: ${parsed.merchant}`
            : current.note,
      }));

      showToast("success", "Receipt analyzed. Please review detected fields.");
    } catch {
      showToast("error", "Receipt analysis failed. Please enter details manually.");
    } finally {
      setScanningReceipt(false);
    }
  }

  useEffect(() => {
    const trimmedNote = form.note.trim();
    if (!trimmedNote || form.category.trim()) {
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

  // Filter transactions based on search and type
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = 
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      t.amount.toString().includes(searchQuery);
    
    const matchesType = filterType === "ALL" || t.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add transaction</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quickly log income and expenses.</p>
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
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as "INCOME" | "EXPENSE" }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                </select>
            </Field>
          </div>

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
              {filteredTransactions.map((transaction) => (
                <article key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{transaction.category}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${transaction.type === "INCOME" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
                        {transaction.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{transaction.note || transaction.date.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-sm font-semibold ${transaction.type === "INCOME" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: transaction.currency,
                        maximumFractionDigits: transaction.currency === "JPY" ? 0 : 2,
                      }).format(Number(transaction.amount))}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDelete(transaction.id)}
                       className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
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
