import { createFileRoute } from "@tanstack/react-router";
import { completeSpotifyAuthorization } from "@/lib/spotify-link.server";

const noStoreHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export const Route = createFileRoute("/api/public/spotify-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = process.env["SPOTIFY_CLIENT_ID"];
        const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
        const tokenEncryptionKey = process.env["SPOTIFY_TOKEN_ENCRYPTION_KEY"];
        if (!clientId || !clientSecret || !tokenEncryptionKey) {
          return new Response("Spotify linking is not configured", { status: 503, headers: noStoreHeaders });
        }

        const result = await completeSpotifyAuthorization({
          code: url.searchParams.get("code"),
          state: url.searchParams.get("state"),
          providerError: url.searchParams.get("error"),
          clientId,
          clientSecret,
          tokenEncryptionKey,
        });
        if (!result.redirectTo) {
          return new Response("This Spotify link request is invalid or has expired. Return to Lyniv and try again.", {
            status: 400,
            headers: noStoreHeaders,
          });
        }
        return new Response(null, {
          status: 303,
          headers: { ...noStoreHeaders, Location: result.redirectTo },
        });
      },
    },
  },
});