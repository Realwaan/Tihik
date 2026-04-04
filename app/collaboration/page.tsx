import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppTopNav } from "@/components/app-top-nav";
import { CollaborationManager } from "@/components/collaboration-manager";

export default async function CollaborationPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="page-shell min-h-screen bg-white px-6 py-8 text-slate-900 dark:bg-slate-900 dark:text-slate-100 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AppTopNav
          title="Collaboration"
          subtitle="Share households, split expenses, and settle balances together."
        />

        <CollaborationManager />
      </div>
    </main>
  );
}
