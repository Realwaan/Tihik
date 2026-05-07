"use client";

import { useMemo, useState } from "react";

import { buildBrandfetchLogoProxySource } from "@/lib/brandfetch-logo";
import type { WalletBadge } from "@/lib/wallet-badges";

type WalletLogoDotProps = {
  badge: WalletBadge;
  label: string;
  className?: string;
  sizeClass?: string;
  textClass?: string;
  imageClassName?: string;
};

function buildLogoSources(badge: WalletBadge) {
  const sources = new Set<string>();

  const brandfetchSource = buildBrandfetchLogoProxySource(badge.officialLogoDomain);
  if (brandfetchSource) {
    sources.add(brandfetchSource);
  }

  if (badge.officialLogoPath) {
    sources.add(badge.officialLogoPath);
  }

  if (badge.officialLogoUrl) {
    sources.add(badge.officialLogoUrl);
  }

  return Array.from(sources);
}

export function WalletLogoDot({
  badge,
  label,
  className = "",
  sizeClass = "h-5 w-5",
  textClass = "text-[9px]",
  imageClassName = "absolute inset-[1px] h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-full object-contain",
}: WalletLogoDotProps) {
  const sources = useMemo(() => buildLogoSources(badge), [badge]);
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());
  const sourceNamespace = label.trim().toLowerCase() || "wallet-logo-dot";
  const source =
    sources.find((candidate) => !failedSources.has(`${sourceNamespace}:${candidate}`)) ?? null;

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
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${badge.logoGradientClass} font-bold text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] ring-1 ring-white/35 dark:ring-black/30 ${sizeClass} ${textClass} ${className}`.trim()}
    >
      <span>{badge.logoText}</span>
      {source ? (
        <img
          key={source}
          src={source}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          data-source-index="0"
          className={imageClassName}
          onError={advanceSource}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth === 0 || image.naturalHeight === 0) {
              advanceSource();
            }
          }}
        />
      ) : null}
    </span>
  );
}
