import { Landmark, Smartphone } from "lucide-react";

import { getWalletBadge } from "@/lib/wallet-badges";

type WalletCategoryBadgeProps = {
  category: string;
  className?: string;
};

export function WalletCategoryBadge({ category, className = "" }: WalletCategoryBadgeProps) {
  const walletBadge = getWalletBadge(category);
  if (!walletBadge) return null;

  const Icon = walletBadge.kind === "bank" ? Landmark : Smartphone;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide backdrop-blur ${walletBadge.toneClass} ${className}`.trim()}
      title={`${category} wallet badge`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${walletBadge.iconToneClass}`}
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span className={walletBadge.labelClass}>{walletBadge.code}</span>
    </span>
  );
}
