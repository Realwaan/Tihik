"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";

import type { WalletBadge } from "@/lib/wallet-badges";

type WalletBrandLogoProps = {
  badge: WalletBadge | null;
  label: string;
  className?: string;
};

function buildLogoSources(badge: WalletBadge | null, label: string) {
  const sources = new Set<string>();
  const normalized = label.trim().toLowerCase();

  // Prioritize network logos when account names include card rails used in PH.
  if (normalized.includes("master") || normalized.includes("cirrus")) {
    sources.add("https://logo.clearbit.com/mastercard.com");
  }
  if (normalized.includes("visa")) {
    sources.add("https://logo.clearbit.com/visa.com");
  }
  if (normalized.includes("jcb")) {
    sources.add("https://logo.clearbit.com/jcb.co.jp");
  }
  if (normalized.includes("amex") || normalized.includes("american express")) {
    sources.add("https://logo.clearbit.com/americanexpress.com");
  }
  if (normalized.includes("unionpay")) {
    sources.add("https://logo.clearbit.com/unionpayintl.com");
  }
  if (normalized.includes("bancnet")) {
    sources.add("https://logo.clearbit.com/bancnetonline.com");
  }

  if (badge?.officialLogoPath) {
    sources.add(badge.officialLogoPath);
  }
  if (badge?.officialLogoUrl) {
    sources.add(badge.officialLogoUrl);
  }

  return Array.from(sources);
}

export function WalletBrandLogo({
  badge,
  label,
  className = "",
}: WalletBrandLogoProps) {
  const sources = useMemo(() => buildLogoSources(badge, label), [badge, label]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [label, badge?.code, sources]);

  const source = sources[sourceIndex];

  return (
    <span
      className={`inline-flex h-8 min-w-[3.1rem] items-center justify-center rounded-lg bg-white/12 px-2 backdrop-blur-sm ${className}`.trim()}
    >
      {source ? (
        <img
          src={source}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-5 w-auto max-w-[4.5rem] object-contain"
          onError={() => {
            setSourceIndex((current) => Math.min(current + 1, sources.length));
          }}
        />
      ) : (
        <CreditCard className="h-4 w-4 text-white/85" />
      )}
    </span>
  );
}
