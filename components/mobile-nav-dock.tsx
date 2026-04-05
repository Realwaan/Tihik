"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, HandCoins, House, Repeat2, Users } from "lucide-react";

import { triggerHaptic } from "@/lib/haptics";

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

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavDock() {
  const pathname = usePathname();
  const [dockReady, setDockReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDockReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 px-3 lg:bottom-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between rounded-3xl border border-slate-200/80 bg-white/90 px-2 py-2 shadow-lg backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90 lg:max-w-3xl lg:rounded-2xl lg:border-white/15 lg:bg-white/75 lg:px-1.5 lg:py-1.5 lg:shadow-[0_12px_30px_rgba(15,23,42,0.14)] dark:lg:bg-slate-900/75 dark:lg:shadow-[0_12px_30px_rgba(2,6,23,0.5)]">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              onClick={() => triggerHaptic("light")}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-all duration-300 ease-out motion-reduce:transition-none sm:text-xs lg:gap-0.5 lg:px-1.5 lg:py-1.25 lg:text-[10px] ${
                dockReady
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              } ${
                active
                  ? "bg-white/75 text-emerald-800 ring-1 ring-emerald-500/15 shadow-[0_8px_18px_rgba(16,185,129,0.12)] dark:bg-slate-800/75 dark:text-emerald-200 dark:ring-emerald-400/20"
                  : "text-slate-500 hover:bg-slate-100/90 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
              style={{ transitionDelay: dockReady ? `${index * 45}ms` : "0ms" }}
            >
              <Icon className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
