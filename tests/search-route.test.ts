import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/api/search/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("address search endpoint", () => {
  it("rejects empty or oversized queries before contacting a provider", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    for (const query of ["", "ab", "x".repeat(161)]) {
      const response = await GET(
        new NextRequest(`http://localhost/api/search?q=${query}`),
      );
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(upstream).not.toHaveBeenCalled();
  });
  it("restricts the provider request to London and returns normalized locations", async () => {
    vi.stubEnv("MAPTILER_API_KEY", "");
    const upstream = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          features: [
            {
              geometry: { type: "Point", coordinates: [-0.14, 51.49] },
              properties: { name: "Pimlico" },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", upstream);
    const response = await GET(
      new NextRequest("http://localhost/api/search?q=Pimlico"),
    );
    const requestUrl = upstream.mock.calls[0][0] as URL;
    expect(requestUrl.hostname).toBe("photon.komoot.io");
    expect(requestUrl.searchParams.get("bbox")).toBe("-0.51,51.28,0.34,51.70");
    expect((await response.json()).results[0]).toMatchObject({
      label: "Pimlico",
      coordinates: [-0.14, 51.49],
      precision: "area",
    });
  });
  it("returns a recoverable message when the provider is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Timeout")));
    const response = await GET(
      new NextRequest("http://localhost/api/search?q=Pimlico"),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("Try again");
  });
  it("does not expose a configured provider key in a failed response", async () => {
    vi.stubEnv("MAPTILER_API_KEY", "test-private-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    const response = await GET(
      new NextRequest("http://localhost/api/search?q=Pimlico"),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("test-private-key");
  });
});
