"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Film,
  Fuel,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Receipt,
  Search,
  ShoppingBag,
  Smartphone,
  TramFront,
  Tv,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { WalletLogoDot } from "@/components/ui/wallet-logo-dot";
import { getWalletBadge } from "@/lib/wallet-badges";

type CategoryComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
};

type CategoryVisual = {
  icon: LucideIcon;
  toneClass: string;
};

const CATEGORY_VISUALS: Array<{
  keywords: string[];
  visual: CategoryVisual;
}> = [
  {
    keywords: ["food", "dining", "groceries"],
    visual: {
      icon: UtensilsCrossed,
      toneClass: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30",
    },
  },
  {
    keywords: ["rent", "utilities", "internet"],
    visual: {
      icon: Home,
      toneClass: "text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/30",
    },
  },
  {
    keywords: ["transport"],
    visual: {
      icon: TramFront,
      toneClass: "text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30",
    },
  },
  {
    keywords: ["fuel"],
    visual: {
      icon: Fuel,
      toneClass: "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30",
    },
  },
  {
    keywords: ["healthcare", "insurance"],
    visual: {
      icon: HeartPulse,
      toneClass: "text-pink-700 bg-pink-100 dark:text-pink-300 dark:bg-pink-900/30",
    },
  },
  {
    keywords: ["education"],
    visual: {
      icon: GraduationCap,
      toneClass: "text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/30",
    },
  },
  {
    keywords: ["entertainment"],
    visual: {
      icon: Film,
      toneClass: "text-fuchsia-700 bg-fuchsia-100 dark:text-fuchsia-300 dark:bg-fuchsia-900/30",
    },
  },
  {
    keywords: ["subscription"],
    visual: {
      icon: Tv,
      toneClass: "text-cyan-700 bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-900/30",
    },
  },
  {
    keywords: ["shopping", "travel"],
    visual: {
      icon: ShoppingBag,
      toneClass: "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30",
    },
  },
  {
    keywords: ["salary", "bonus", "freelance", "gift", "refund", "interest", "investment", "income"],
    visual: {
      icon: HandCoins,
      toneClass: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  },
];

const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  icon: Receipt,
  toneClass: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
};

function getCategoryVisual(category: string): CategoryVisual {
  const normalized = category.trim().toLowerCase();
  if (!normalized) {
    return {
      icon: Search,
      toneClass: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    };
  }

  const walletBadge = getWalletBadge(category);
  if (walletBadge) {
    return {
      icon: walletBadge.kind === "bank" ? Landmark : Smartphone,
      toneClass: walletBadge.iconToneClass,
    };
  }

  const matched = CATEGORY_VISUALS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );

  if (matched) {
    return matched.visual;
  }

  if (normalized.includes("cash") || normalized.includes("wallet")) {
    return {
      icon: Wallet,
      toneClass: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30",
    };
  }

  if (normalized.includes("bank") || normalized.includes("bpi") || normalized.includes("bdo")) {
    return {
      icon: Landmark,
      toneClass: "text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/30",
    };
  }

  if (normalized.includes("debit") || normalized.includes("credit") || normalized.includes("card")) {
    return {
      icon: CircleDollarSign,
      toneClass: "text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30",
    };
  }

  if (normalized.includes("allowance") || normalized.includes("payment")) {
    return {
      icon: Banknote,
      toneClass: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30",
    };
  }

  if (normalized.includes("fare") || normalized.includes("ride") || normalized.includes("commute")) {
    return {
      icon: Car,
      toneClass: "text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30",
    };
  }

  return DEFAULT_CATEGORY_VISUAL;
}

export function CategoryCombobox({
  value,
  onChange,
  options,
  placeholder = "Select or type a category",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedOptions = useMemo(
    () => Array.from(new Set(options.map((item) => item.trim()).filter(Boolean))),
    [options]
  );

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return normalizedOptions;
    }
    return normalizedOptions.filter((item) =>
      item.toLowerCase().includes(query)
    );
  }, [normalizedOptions, value]);

  const activeVisual = useMemo(() => getCategoryVisual(value), [value]);
  const ActiveIcon = activeVisual.icon;

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <span
        className={`pointer-events-none absolute left-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md ${activeVisual.toneClass}`}
      >
        <ActiveIcon className="h-3.5 w-3.5" />
      </span>
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-11 text-slate-900 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Toggle category list"
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {filteredOptions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              No premade category matches.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto p-2">
              {filteredOptions.map((option) => {
                const selected = option.toLowerCase() === value.trim().toLowerCase();
                const optionVisual = getCategoryVisual(option);
                const walletBadge = getWalletBadge(option);
                const OptionIcon = optionVisual.icon;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${optionVisual.toneClass}`}
                      >
                        <OptionIcon className="h-3.5 w-3.5" />
                      </span>
                      <span>{option}</span>
                      {walletBadge ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${walletBadge.toneClass}`}
                        >
                          <WalletLogoDot
                            badge={walletBadge}
                            label={option}
                            sizeClass="h-4 w-4"
                            textClass="text-[8px]"
                          />
                          {walletBadge.code}
                        </span>
                      ) : null}
                    </span>
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}