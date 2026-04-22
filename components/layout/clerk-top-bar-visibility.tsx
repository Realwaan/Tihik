"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type ClerkTopBarVisibilityProps = {
  children: ReactNode;
};

export function ClerkTopBarVisibility({ children }: ClerkTopBarVisibilityProps) {
  const pathname = usePathname();

  if (!pathname) {
    return <>{children}</>;
  }

  const showOnPath =
    pathname === "/" || pathname.startsWith("/signin") || pathname.startsWith("/signup");

  if (!showOnPath) {
    return null;
  }

  return <>{children}</>;
}
