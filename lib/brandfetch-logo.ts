const CLEARBIT_HOST = "logo.clearbit.com";

export function normalizeLogoDomain(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    const hostname = parsed.hostname.trim().toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

export function extractDomainFromLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;

  try {
    const parsed = new URL(logoUrl);

    if (parsed.hostname.toLowerCase() === CLEARBIT_HOST) {
      const clearbitDomain = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
      return normalizeLogoDomain(clearbitDomain);
    }

    return normalizeLogoDomain(parsed.hostname);
  } catch {
    return null;
  }
}

export function buildBrandfetchLogoProxySource(
  domain: string | null | undefined
): string | null {
  const normalizedDomain = normalizeLogoDomain(domain);
  if (!normalizedDomain) return null;

  return `/api/brandfetch/logo?domain=${encodeURIComponent(normalizedDomain)}`;
}