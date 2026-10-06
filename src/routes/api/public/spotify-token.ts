import { createFileRoute } from "@tanstack/react-router";

type SpotifyTokenPayload = {
  access_token?: unknown;
  expires_in?: unknown;
};

type CachedSpotifyToken = {
  accessToken: string;
  expiresAt: number;
  expiresIn: number;
};

let cachedSpotifyToken: CachedSpotifyToken | null = null;
let tokenRequest: Promise<CachedSpotifyToken> | null = null;

const noStoreHeaders = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/public/spotify-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (!origin || origin !== new URL(request.url).origin) {
          return Response.json({ error: "Same-origin requests only" }, { status: 403, headers: noStoreHeaders });
        }

        const clientId = process.env["SPOTIFY_CLIENT_ID"];
        const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
        if (!clientId || !clientSecret) {
          return Response.json({ error: "Spotify credentials are not configured" }, { status: 503, headers: noStoreHeaders });
        }

        if (cachedSpotifyToken && cachedSpotifyToken.expiresAt > Date.now()) {
          return Response.json(
            { accessToken: cachedSpotifyToken.accessToken, expiresIn: cachedSpotifyToken.expiresIn },
            { headers: noStoreHeaders },
          );
        }

        try {
          if (!tokenRequest) {
            tokenRequest = fetchSpotifyToken(clientId, clientSecret);
          }
          const token = await tokenRequest;
          cachedSpotifyToken = token;
          return Response.json(
            { accessToken: token.accessToken, expiresIn: token.expiresIn },
            { headers: noStoreHeaders },
          );
        } catch {
          return Response.json({ error: "Spotify token service is unavailable" }, { status: 502, headers: noStoreHeaders });
        } finally {
          tokenRequest = null;
        }
      },
    },
  },
});

async function fetchSpotifyToken(clientId: string, clientSecret: string): Promise<CachedSpotifyToken> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as SpotifyTokenPayload;
  if (typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") {
    throw new Error("Spotify returned an invalid token response");
  }

  const expiresIn = payload.expires_in;
  return {
    accessToken: payload.access_token,
    expiresIn,
    expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000,
  };
}