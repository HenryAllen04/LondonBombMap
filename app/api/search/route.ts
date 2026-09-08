import { NextRequest, NextResponse } from "next/server";
import { normalizeMapTiler, normalizePhoton } from "@/lib/search";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 160) {
    return NextResponse.json(
      { error: "Enter an address, place or postcode (3–160 characters)." },
      { status: 400, headers },
    );
  }
  const apiKey = process.env.MAPTILER_API_KEY;
  const url = apiKey
    ? new URL(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`,
      )
    : new URL("https://photon.komoot.io/api/");
  if (apiKey) {
    url.searchParams.set("key", apiKey);
    url.searchParams.set("country", "gb");
    url.searchParams.set("autocomplete", "false");
    url.searchParams.set("proximity", "-0.1394,51.4886");
  } else {
    url.searchParams.set("q", query);
    url.searchParams.set("lat", "51.4886");
    url.searchParams.set("lon", "-0.1394");
    url.searchParams.set("lang", "en");
  }
  url.searchParams.set("bbox", "-0.51,51.28,0.34,51.70");
  url.searchParams.set("limit", "6");
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Geocoder unavailable");
    const data = await response.json();
    if (!Array.isArray(data.features))
      throw new Error("Invalid geocoder response");
    const results = apiKey
      ? normalizeMapTiler(data.features)
      : normalizePhoton(data.features);
    return NextResponse.json(
      { results, provider: apiKey ? "MapTiler" : "Photon / OpenStreetMap" },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Address search is taking a moment. Try again, or choose a place on the map.",
      },
      { status: 503, headers },
    );
  }
}
