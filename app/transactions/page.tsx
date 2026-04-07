import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppTopNav } from "@/components/app-top-nav";
import { TransactionsWorkspaceShell } from "@/components/transactions-workspace-shell";

export default async function TransactionsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="page-shell dock-safe app-surface min-h-screen px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AppTopNav
          title="Transactions"
          subtitle="Capture spending quickly and manage recurring templates and installment plans in one place."
        />
        <TransactionsWorkspaceShell />
      </div>
    </main>
  );
}
