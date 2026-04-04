"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  // Add try-catch to handle potential context issues during hot reload
  try {
    const { theme, toggleTheme } = useTheme();

    return (
      <button
        onClick={toggleTheme}
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label="Toggle theme"
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </button>
    );
  } catch (error) {
    // Fallback during dev server hot reload issues
    return (
      <button
        className="inline-flex h-10 w-10 rounded-full border border-slate-200 bg-white opacity-50"
        aria-label="Theme toggle loading..."
        disabled
      >
        <Moon className="h-5 w-5 m-auto text-slate-400" />
      </button>
    );
  }
}
