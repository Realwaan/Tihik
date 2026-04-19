"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BANK_INTEGRATION_CREDIT_ONLY_MESSAGE,
  isCreditCardLikeAccount,
} from "@/lib/bank-account-eligibility";

type ConnectionItem = {
  id: string;
  provider: string;
  providerAccountId: string;
  accountLabel: string | null;
  tokenScope: string | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
};

type SyncResult = {
  fetched: number;
  imported: number;
  nextCursor: string | null;
};

export function BankIntegrationPanel() {
  const [provider, setProvider] = useState("GENERIC");
  const [providerAccountId, setProviderAccountId] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenScope, setTokenScope] = useState("transactions:read accounts:read");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId]
  );

  async function loadConnections() {
    try {
      setLoadingConnections(true);
      setError(null);
      const response = await fetch("/api/bank/connections");
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load bank connections");
      }

      const list = (json.data ?? []) as ConnectionItem[];
      setConnections(list);
      if (list.length > 0) {
        setSelectedConnectionId((current) => current || list[0].id);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load connections");
    } finally {
      setLoadingConnections(false);
    }
  }

  async function saveConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingConnection(true);
      setError(null);

      const normalizedAccountLabel = accountLabel.trim();
      const normalizedProviderAccountId = providerAccountId.trim();
      const accountIdentity = normalizedAccountLabel || normalizedProviderAccountId;

      if (!isCreditCardLikeAccount(accountIdentity)) {
        throw new Error(BANK_INTEGRATION_CREDIT_ONLY_MESSAGE);
      }

      const response = await fetch("/api/bank/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          providerAccountId: normalizedProviderAccountId || null,
          accountLabel: normalizedAccountLabel || null,
          accessToken,
          refreshToken: refreshToken.trim() || null,
          tokenScope,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt).toISOString() : null,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save connection");
      }

      setAccessToken("");
      setRefreshToken("");
      await loadConnections();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save connection");
    } finally {
      setSavingConnection(false);
    }
  }

  async function runSync() {
    try {
      setSyncing(true);
      setError(null);
      setSyncResult(null);

      const response = await fetch("/api/bank/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to sync transactions");
      }

      setSyncResult(json.data as SyncResult);
      await loadConnections();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to sync transactions");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Read-only bank connection</h2>
          <Button type="button" variant="outline" onClick={loadConnections} disabled={loadingConnections}>
            {loadingConnections ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={saveConnection}>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Provider
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Provider account id
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={providerAccountId}
              onChange={(event) => setProviderAccountId(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Account label
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={accountLabel}
              onChange={(event) => setAccountLabel(event.target.value)}
              placeholder="Visa Credit"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Credit-card accounts only (for example: Visa Credit, Mastercard Credit, Amex Credit).
            </p>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Token scope
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={tokenScope}
              onChange={(event) => setTokenScope(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
            Access token
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              required
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
            Refresh token (optional)
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={refreshToken}
              onChange={(event) => setRefreshToken(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
            Token expires at (optional)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={tokenExpiresAt}
              onChange={(event) => setTokenExpiresAt(event.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingConnection}>
              {savingConnection ? "Saving..." : "Save read-only connection"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Sync transactions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Connection
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={selectedConnectionId}
              onChange={(event) => setSelectedConnectionId(event.target.value)}
            >
              <option value="">Auto-select first connection</option>
              {connections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.accountLabel || item.providerAccountId || item.provider}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Start date (optional)
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            End date (optional)
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={runSync} disabled={syncing || connections.length === 0}>
            {syncing ? "Syncing..." : "Run read-only sync"}
          </Button>
          {selectedConnection ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last synced: {selectedConnection.lastSyncedAt ? new Date(selectedConnection.lastSyncedAt).toLocaleString() : "Never"}
            </p>
          ) : null}
        </div>

        {syncResult ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-100">
            Imported {syncResult.imported} of {syncResult.fetched} fetched transaction(s).
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-900/25 dark:text-rose-100">
            {error}
          </div>
        ) : null}
      </section>
    </div>
  );
}
