import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  beginSpotifyAuthorization,
  disconnectSpotifyAccount,
  getSpotifyConnectionStatus,
  getUnreviewedSpotifyAlbums,
} from "@/lib/spotify-link.server";

export const startSpotifyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientId = process.env["SPOTIFY_CLIENT_ID"];
    if (!clientId) throw new Error("Spotify is not configured");
    const request = getRequest();
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get("origin");
    if (!originHeader || new URL(originHeader).origin !== requestOrigin) {
      throw new Error("Spotify linking must start from Lyniv");
    }
    return beginSpotifyAuthorization(context.userId, requestOrigin, clientId);
  });

export const getSpotifyLinkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getSpotifyConnectionStatus(context.userId));

export const disconnectSpotifyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await disconnectSpotifyAccount(context.userId);
    return { disconnected: true };
  });

export const getSpotifyListeningRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ refresh: z.boolean().optional() }).parse(input))
  .handler(async ({ context }) => {
    const clientId = process.env["SPOTIFY_CLIENT_ID"];
    const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
    const tokenEncryptionKey = process.env["SPOTIFY_TOKEN_ENCRYPTION_KEY"];
    if (!clientId || !clientSecret || !tokenEncryptionKey) {
      throw new Error("Spotify recommendations are not configured");
    }
    return getUnreviewedSpotifyAlbums({
      userId: context.userId,
      clientId,
      clientSecret,
      tokenEncryptionKey,
    });
  });