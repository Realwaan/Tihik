"use client";

import { useMemo, useState } from "react";
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
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());
  const sourceNamespace = label.trim().toLowerCase() || "wallet-brand-logo";
  const source =
    sources.find((candidate) => !failedSources.has(`${sourceNamespace}:${candidate}`)) ?? null;
  const gradientClass = badge?.logoGradientClass ?? "from-slate-400 to-slate-600";
  const normalizedLabelText = label
    .trim()
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase();
  const fallbackText =
    badge?.logoText ?? (normalizedLabelText || "WL");

  const advanceSource = () => {
    if (!source) {
      return;
    }

    const sourceKey = `${sourceNamespace}:${source}`;
    setFailedSources((currentFailed) => {
      if (currentFailed.has(sourceKey)) {
        return currentFailed;
      }
      const nextFailed = new Set(currentFailed);
      nextFailed.add(sourceKey);
      return nextFailed;
    });
  };

  return (
    <span
      className={`relative inline-flex h-9 min-w-[3.35rem] items-center justify-center overflow-hidden rounded-xl px-2.5 ${source ? "border border-transparent bg-transparent shadow-none" : `border border-white/30 bg-gradient-to-br ${gradientClass} text-white shadow-[0_8px_20px_rgba(15,23,42,0.22)]`} ${className}`.trim()}
    >
      {source ? (
        <img
          key={source}
          src={source}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          data-source-index="0"
          className="relative z-10 h-6 w-auto max-w-[4.75rem] object-contain"
          onError={advanceSource}
          onLoad={(event) => {
            const image = event.currentTarget;
            // Some placeholder files resolve to an image element with zero dimensions.
            if (image.naturalWidth === 0 || image.naturalHeight === 0) {
              advanceSource();
            }
          }}
        />
      ) : (
        <span className="relative z-10 inline-flex items-center gap-1">
          <span className="text-[11px] font-semibold tracking-[0.08em]">{fallbackText}</span>
          <CreditCard className="h-3.5 w-3.5 opacity-90" />
        </span>
      )}
    </span>
  );
}
