# Wallet/Bank SVG Assets

Local SVG logo placeholders are included in:
- `public/logos/wallets`
- `public/logos/banks`

These files are intentionally lightweight and optimized for in-app badge rendering.

## Replacing with brand-approved logos

If you have permission/license to use official logos, replace each file while keeping the same filename so existing mappings continue to work.

The path mapping is defined in `lib/wallet-badges.ts`.

## Design notes

- Keep output in SVG format for crisp rendering at small badge sizes.
- Prefer square artboards (for example `96x96`) with safe padding.
- Use high contrast text/shapes so logos remain legible in both light and dark UI contexts.
