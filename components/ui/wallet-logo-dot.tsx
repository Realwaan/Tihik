"use client";

import { useEffect, useMemo, useState } from "react";

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
  imageClassName = "absolute inset-[1px] h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-full bg-white object-contain p-[1px]",
}: WalletLogoDotProps) {
  const sources = useMemo(
    () => buildLogoSources(badge),
    [badge.officialLogoPath, badge.officialLogoUrl]
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [badge.code, sources]);

  const source = sources[sourceIndex];

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${badge.logoGradientClass} font-bold text-white shadow-sm ${sizeClass} ${textClass} ${className}`.trim()}
    >
      <span>{badge.logoText}</span>
      {source ? (
        <img
          src={source}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={imageClassName}
          onError={() => {
            setSourceIndex((current) => Math.min(current + 1, sources.length));
          }}
        />
      ) : null}
    </span>
  );
}
