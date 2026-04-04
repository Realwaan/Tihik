"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

type CategoryComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
};

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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                    <span>{option}</span>
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