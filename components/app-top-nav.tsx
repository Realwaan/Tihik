"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, HandCoins, House, Repeat2, Users } from "lucide-react";

type TopNavProps = {
  title: string;
  subtitle?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Transactions", href: "/transactions", icon: Repeat2 },
  { label: "Budgets", href: "/budgets", icon: BarChart3 },
  { label: "Collaboration", href: "/collaboration", icon: Users },
  { label: "Profile", href: "/profile", icon: HandCoins },
];

export function AppTopNav({ title, subtitle }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="mb-6 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:mb-8 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">TrackIt</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 sm:mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <nav className="mt-4 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
