import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountOverview } from "@/components/account-overview";
import { AppTopNav } from "@/components/app-top-nav";

export default async function AccountOverviewPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="page-shell dock-safe app-surface min-h-screen px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AppTopNav
          title="Account Overview"
          subtitle="Inspect balances, account-linked transactions, and account cleanup actions."
        />
        <AccountOverview />
      </div>
    </main>
  );
}
