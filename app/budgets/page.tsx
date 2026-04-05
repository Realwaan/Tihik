import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppTopNav } from "@/components/app-top-nav";
import { BudgetsManager } from "@/components/budgets-manager";

export default async function BudgetsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="page-shell min-h-screen bg-white px-4 py-6 pb-32 text-slate-900 dark:bg-slate-900 dark:text-slate-100 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AppTopNav
          title="Budgets"
          subtitle="Plan limits by category and keep monthly spending on track."
        />
        <BudgetsManager />
      </div>
    </main>
  );
}
