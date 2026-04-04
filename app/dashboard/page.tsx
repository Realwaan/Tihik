import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardDashboard } from "@/components/dashboard-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return <DashboardDashboard />;
}
