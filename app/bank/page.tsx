import { BankIntegrationPanel } from "@/components/bank-integration-panel";

export default function BankIntegrationPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bank API Integration</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Read-only setup for importing transactions. This page never performs transfers, payments, or write operations to your bank.
        </p>
      </section>

      <BankIntegrationPanel />
    </main>
  );
}
