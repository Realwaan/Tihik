import { NextRequest, NextResponse } from "next/server";

import { normalizeLogoDomain } from "@/lib/brandfetch-logo";

type BrandfetchFormat = {
  src?: string;
  format?: string;
  width?: number;
};

type BrandfetchLogo = {
  type?: string;
  theme?: string;
  formats?: BrandfetchFormat[];
};

type BrandfetchResponse = {
  logos?: BrandfetchLogo[];
};

const BRAND_FETCH_API_BASE_URL = "https://api.brandfetch.io/v2/brands";
const CLEARBIT_BASE_URL = "https://logo.clearbit.com";
const CACHE_CONTROL_VALUE = "public, s-maxage=86400, stale-while-revalidate=604800";

const FORMAT_PRIORITY: Record<string, number> = {
  svg: 6,
  webp: 5,
  png: 4,
  jpg: 3,
  jpeg: 3,
};

function getBrandfetchApiKey() {
  return (
    process.env.BRAND_FETCH_API_KEY?.trim() ||
    process.env.BRANDFETCH_API_KEY?.trim() ||
    null
  );
}

function pickBestLogoSource(payload: BrandfetchResponse): string | null {
  let bestSource: string | null = null;
  let bestScore = -1;
  const hasLightLogo = (payload.logos ?? []).some((logo) => {
    const normalizedType = logo.type?.toLowerCase() ?? "";
    const normalizedTheme = logo.theme?.toLowerCase() ?? "";
    return normalizedType === "logo" && normalizedTheme === "light";
  });

  for (const logo of payload.logos ?? []) {
    const normalizedType = logo.type?.toLowerCase() ?? "";
    const normalizedTheme = logo.theme?.toLowerCase() ?? "";
    const typeScore = hasLightLogo
      ? normalizedType === "logo"
        ? 80
        : normalizedType === "symbol"
          ? 55
          : normalizedType === "icon"
            ? 10
            : 20
      : normalizedType === "icon"
        ? 80
        : normalizedType === "symbol"
          ? 70
          : normalizedType === "logo"
            ? 45
            : 20;
    const themeScore =
      normalizedTheme === "light" ? 18 : normalizedTheme === "dark" ? 2 : 10;

    for (const format of logo.formats ?? []) {
      const source = format.src?.trim();
      if (!source) continue;

      const formatKey = format.format?.toLowerCase() ?? "";
      const formatScore = FORMAT_PRIORITY[formatKey] ?? 0;
      const widthScore = Math.min((format.width ?? 0) / 1000, 5);
      const score = typeScore + themeScore + formatScore * 10 + widthScore;

      if (score > bestScore) {
        bestSource = source;
        bestScore = score;
      }
    }
  }

  return bestSource;
}

async function fetchLogoResponse(source: string) {
  return fetch(source, {
    headers: {
      Accept: "image/*,*/*;q=0.8",
    },
  });
}

async function streamImageResponse(source: string, status = 200) {
  const logoResponse = await fetchLogoResponse(source);

  if (!logoResponse.ok || !logoResponse.body) {
    return null;
  }

  const headers = new Headers();
  const contentType = logoResponse.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  headers.set("Cache-Control", CACHE_CONTROL_VALUE);

  return new NextResponse(logoResponse.body, {
    status,
    headers,
  });
}

async function fallbackToClearbit(domain: string) {
  const clearbitSource = `${CLEARBIT_BASE_URL}/${encodeURIComponent(domain)}`;
  return streamImageResponse(clearbitSource, 200);
}

export async function GET(request: NextRequest) {
  const domain = normalizeLogoDomain(request.nextUrl.searchParams.get("domain"));

  if (!domain) {
    return NextResponse.json({ error: "Invalid domain query parameter." }, { status: 400 });
  }

  const apiKey = getBrandfetchApiKey();
  if (!apiKey) {
    const fallbackResponse = await fallbackToClearbit(domain);
    if (fallbackResponse) {
      return fallbackResponse;
    }

    return NextResponse.json(
      { error: "Brandfetch API key is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `${BRAND_FETCH_API_BASE_URL}/${encodeURIComponent(domain)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        next: { revalidate: 60 * 60 * 24 },
      }
    );

    if (!response.ok) {
      const fallbackResponse = await fallbackToClearbit(domain);
      if (fallbackResponse) {
        return fallbackResponse;
      }

      const status = response.status === 404 ? 404 : 502;
      return NextResponse.json(
        { error: `Brandfetch lookup failed for ${domain}.` },
        { status }
      );
    }

    const payload = (await response.json()) as BrandfetchResponse;
    const source = pickBestLogoSource(payload);

    if (!source) {
      const fallbackResponse = await fallbackToClearbit(domain);
      if (fallbackResponse) {
        return fallbackResponse;
      }

      return NextResponse.json(
        { error: `No logo assets returned for ${domain}.` },
        { status: 404 }
      );
    }

    const brandfetchLogoResponse = await streamImageResponse(source, 200);

    if (brandfetchLogoResponse) {
      return brandfetchLogoResponse;
    }

    const fallbackResponse = await fallbackToClearbit(domain);
    if (fallbackResponse) {
      return fallbackResponse;
    }

    return NextResponse.json(
      { error: `Unable to load logo asset for ${domain}.` },
      { status: 502 }
    );
  } catch (error) {
    console.error("Brandfetch logo proxy failed:", error);
    const fallbackResponse = await fallbackToClearbit(domain);
    if (fallbackResponse) {
      return fallbackResponse;
    }

    return NextResponse.json(
      { error: "Unable to fetch logo from Brandfetch." },
      { status: 502 }
    );
  }
}