"use client";

import { useMemo } from "react";
import { CreditCard } from "lucide-react";

import { buildBrandfetchLogoProxySource } from "@/lib/brandfetch-logo";
import type { WalletBadge } from "@/lib/wallet-badges";

type WalletBrandLogoProps = {
  badge: WalletBadge | null;
  label: string;
  className?: string;
};

function addDomainSources(sources: Set<string>, domain: string) {
  const brandfetchSource = buildBrandfetchLogoProxySource(domain);
  if (brandfetchSource) {
    sources.add(brandfetchSource);
  }

  sources.add(`https://logo.clearbit.com/${domain}`);
}

function buildLogoSources(badge: WalletBadge | null, label: string) {
  const sources = new Set<string>();
  const normalized = label.trim().toLowerCase();

  // Prioritize network logos when account names include card rails used in PH.
  if (normalized.includes("master") || normalized.includes("cirrus")) {
    addDomainSources(sources, "mastercard.com");
  }
  if (normalized.includes("visa")) {
    addDomainSources(sources, "visa.com");
  }
  if (normalized.includes("jcb")) {
    addDomainSources(sources, "jcb.co.jp");
  }
  if (normalized.includes("amex") || normalized.includes("american express")) {
    addDomainSources(sources, "americanexpress.com");
  }
  if (normalized.includes("unionpay")) {
    addDomainSources(sources, "unionpayintl.com");
  }
  if (normalized.includes("bancnet")) {
    addDomainSources(sources, "bancnetonline.com");
  }

  if (badge?.officialLogoDomain) {
    addDomainSources(sources, badge.officialLogoDomain);
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
  const source = sources[0];
  const gradientClass = badge?.logoGradientClass ?? "from-slate-400 to-slate-600";

  return (
    <span
      className={`relative inline-flex h-9 min-w-[3.35rem] items-center justify-center overflow-hidden rounded-xl border border-white/40 bg-white/80 px-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-white/15 dark:bg-slate-950/70 ${className}`.trim()}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-25`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[1px] rounded-[10px] bg-white/90 dark:bg-slate-950/78"
      />
      {source ? (
        <img
          key={source}
          src={source}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          data-source-index="0"
          className="relative z-10 h-5 w-auto max-w-[4.75rem] object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]"
          onError={(event) => {
            const image = event.currentTarget;
            const currentIndex = Number(image.dataset.sourceIndex ?? "0");
            const nextIndex = currentIndex + 1;

            if (nextIndex >= sources.length) {
              image.style.display = "none";
              return;
            }

            image.dataset.sourceIndex = String(nextIndex);
            image.src = sources[nextIndex] ?? "";
          }}
        />
      ) : (
        <CreditCard className="relative z-10 h-4 w-4 text-slate-700 dark:text-slate-100" />
      )}
    </span>
  );
}
