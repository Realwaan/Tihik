import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
type Size = "default" | "sm" | "icon";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const variantClass = {
    default:
      "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    ghost:
      "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  }[variant];

  const sizeClass = {
    default: "h-10 rounded-full px-4 py-2 text-sm font-medium",
    sm: "h-9 rounded-lg px-3 py-2 text-sm",
    icon: "h-10 w-10 rounded-full",
  }[size];

  return (
    <button
      className={cn(
        "hover-rise inline-flex cursor-pointer items-center justify-center gap-2 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    />
  );
}
