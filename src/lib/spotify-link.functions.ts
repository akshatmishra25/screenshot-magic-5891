import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveRequestOrigin } from "@/lib/server-origin";
import {
  beginSpotifyAuthorization,
  disconnectSpotifyAccount,
  getSpotifyConnectionStatus,
  getUnreviewedSpotifyAlbums,
} from "@/lib/spotify-link.server";

export const startSpotifyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    if (input && typeof input === "object" && "origin" in input && typeof (input as any).origin === "string") {
      return { origin: (input as any).origin as string };
    }
    return {} as { origin?: string };
  })
  .handler(async ({ data, context }) => {
    const clientId = process.env["SPOTIFY_CLIENT_ID"];
    if (!clientId) throw new Error("Spotify is not configured. Missing SPOTIFY_CLIENT_ID.");
    const request = getRequest();
    const origin = resolveRequestOrigin(request, data?.origin);
    return beginSpotifyAuthorization(context.userId, origin, clientId);
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
  .validator((input: unknown) => z.object({ refresh: z.boolean().optional() }).parse(input ?? {}))
  .handler(async ({ context }) => {
    const clientId = process.env["SPOTIFY_CLIENT_ID"];
    const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
    const tokenEncryptionKey =
      process.env["SPOTIFY_TOKEN_ENCRYPTION_KEY"] ||
      process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
      clientSecret;
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