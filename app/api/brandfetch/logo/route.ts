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
const CACHE_CONTROL_VALUE = "public, s-maxage=86400, stale-while-revalidate=604800";

const FORMAT_PRIORITY: Record<string, number> = {
  svg: 5,
  webp: 4,
  png: 3,
  jpg: 2,
  jpeg: 2,
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

  for (const logo of payload.logos ?? []) {
    const typeScore = logo.type === "logo" ? 50 : logo.type === "icon" ? 20 : 0;
    const themeScore = logo.theme === "dark" ? 2 : logo.theme === "light" ? 1 : 0;

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

export async function GET(request: NextRequest) {
  const domain = normalizeLogoDomain(request.nextUrl.searchParams.get("domain"));

  if (!domain) {
    return NextResponse.json({ error: "Invalid domain query parameter." }, { status: 400 });
  }

  const apiKey = getBrandfetchApiKey();
  if (!apiKey) {
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
      const status = response.status === 404 ? 404 : 502;
      return NextResponse.json(
        { error: `Brandfetch lookup failed for ${domain}.` },
        { status }
      );
    }

    const payload = (await response.json()) as BrandfetchResponse;
    const source = pickBestLogoSource(payload);

    if (!source) {
      return NextResponse.json(
        { error: `No logo assets returned for ${domain}.` },
        { status: 404 }
      );
    }

    const logoResponse = await fetch(source, {
      headers: {
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!logoResponse.ok || !logoResponse.body) {
      return NextResponse.json(
        { error: `Unable to load logo asset for ${domain}.` },
        { status: 502 }
      );
    }

    const headers = new Headers();
    const contentType = logoResponse.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    headers.set("Cache-Control", CACHE_CONTROL_VALUE);

    return new NextResponse(logoResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Brandfetch logo proxy failed:", error);
    return NextResponse.json(
      { error: "Unable to fetch logo from Brandfetch." },
      { status: 502 }
    );
  }
}