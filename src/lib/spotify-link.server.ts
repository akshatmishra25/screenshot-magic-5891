type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};

type SpotifyAlbumDto = {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: "Pop";
  coverUrl: string;
  hues: [number, number];
  tracks: string[];
};

type OAuthState = {
  user_id: string;
  code_verifier: string;
  redirect_uri: string;
  expires_at: string;
};

type SpotifyTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function digestBase64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSpotifyTokens(tokens: SpotifyTokens, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(tokens)),
  );
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSpotifyTokens(value: string, secret: string): Promise<SpotifyTokens> {
  const [version, encodedIv, encodedCiphertext] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext) throw new Error("Stored Spotify connection is invalid");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encodedIv) },
    await encryptionKey(secret),
    base64ToBytes(encodedCiphertext),
  );
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof (parsed as SpotifyTokens).accessToken !== "string" ||
    typeof (parsed as SpotifyTokens).refreshToken !== "string"
  ) {
    throw new Error("Stored Spotify connection is invalid");
  }
  return parsed as SpotifyTokens;
}

export async function beginSpotifyAuthorization(
  userId: string,
  origin: string,
  clientId: string,
): Promise<{ authorizationUrl: string }> {
  const parsedOrigin = new URL(origin);
  if (
    (parsedOrigin.protocol !== "https:" && parsedOrigin.hostname !== "localhost" && parsedOrigin.hostname !== "127.0.0.1") ||
    parsedOrigin.username ||
    parsedOrigin.password
  ) {
    throw new Error("Spotify linking must start from this secure Lyniv page");
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = base64Url(stateBytes);
  const verifier = base64Url(verifierBytes);
  const redirectUri = new URL("/api/public/spotify-callback", parsedOrigin).toString();
  const stateHash = await digestBase64Url(state);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("spotify_oauth_states").insert({
    state_hash: stateHash,
    user_id: userId,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    expires_at: expiresAt,
  });
  if (error) throw new Error("Could not start Spotify linking");

  const challenge = await digestBase64Url(verifier);
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user-top-read user-read-recently-played user-read-private",
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();

  return { authorizationUrl: url.toString() };
}

function profileRedirect(redirectUri: string, username: string | null, status: string): string {
  const callback = new URL(redirectUri);
  callback.pathname = username ? `/u/${encodeURIComponent(username)}` : "/discover";
  callback.search = new URLSearchParams({ spotify: status }).toString();
  callback.hash = "";
  return callback.toString();
}

async function getProfileUsername(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? null;
}

export async function completeSpotifyAuthorization(input: {
  code: string | null;
  state: string | null;
  providerError: string | null;
  clientId: string;
  clientSecret: string;
  tokenEncryptionKey: string;
}): Promise<{ redirectTo: string | null }> {
  if (!input.state) return { redirectTo: null };
  const stateHash = await digestBase64Url(input.state);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("spotify_oauth_states")
    .delete()
    .eq("state_hash", stateHash)
    .select("user_id, code_verifier, redirect_uri, expires_at")
    .maybeSingle();
  if (error || !data) return { redirectTo: null };

  const oauthState = data as OAuthState;
  if (new Date(oauthState.expires_at).getTime() <= Date.now()) {
    const username = await getProfileUsername(oauthState.user_id);
    return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "expired") };
  }

  const username = await getProfileUsername(oauthState.user_id);
  if (input.providerError || !input.code) {
    return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "cancelled") };
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${input.clientId}:${input.clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: oauthState.redirect_uri,
        code_verifier: oauthState.code_verifier,
      }),
    });
    if (!tokenResponse.ok) return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "error") };

    const tokenPayload = (await tokenResponse.json()) as SpotifyTokenResponse;
    if (
      typeof tokenPayload.access_token !== "string" ||
      typeof tokenPayload.refresh_token !== "string" ||
      typeof tokenPayload.expires_in !== "number"
    ) {
      return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "error") };
    }

    const meResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    if (!meResponse.ok) return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "error") };
    const spotifyProfile = (await meResponse.json()) as { id?: unknown; display_name?: unknown };
    if (typeof spotifyProfile.id !== "string") {
      return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "error") };
    }

    const tokens: SpotifyTokens = {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token,
      expiresIn: tokenPayload.expires_in,
      tokenType: typeof tokenPayload.token_type === "string" ? tokenPayload.token_type : "Bearer",
    };
    const encryptedTokens = await encryptSpotifyTokens(tokens, input.tokenEncryptionKey);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    const { error: saveError } = await supabaseAdmin.from("spotify_connections").upsert({
      user_id: oauthState.user_id,
      spotify_user_id: spotifyProfile.id,
      spotify_display_name: typeof spotifyProfile.display_name === "string" ? spotifyProfile.display_name : null,
      encrypted_tokens: encryptedTokens,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (saveError) return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "error") };

    return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "connected") };
  } catch {
    return { redirectTo: profileRedirect(oauthState.redirect_uri, username, "error") };
  }
}

export async function getSpotifyConnectionStatus(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("spotify_connections")
    .select("spotify_display_name, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load Spotify connection");
  return data ? { connected: true, displayName: data.spotify_display_name, connectedAt: data.connected_at } : { connected: false, displayName: null, connectedAt: null };
}

export async function disconnectSpotifyAccount(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("spotify_connections").delete().eq("user_id", userId);
  if (error) throw new Error("Could not disconnect Spotify");
}

async function refreshSpotifyTokens(
  tokens: SpotifyTokens,
  clientId: string,
  clientSecret: string,
): Promise<SpotifyTokens> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refreshToken }),
  });
  if (!response.ok) throw new Error("Spotify connection needs to be renewed");
  const payload = (await response.json()) as SpotifyTokenResponse;
  if (typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") {
    throw new Error("Spotify connection needs to be renewed");
  }
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : tokens.refreshToken,
    expiresIn: payload.expires_in,
    tokenType: typeof payload.token_type === "string" ? payload.token_type : tokens.tokenType,
  };
}

async function tracksFromSpotify(url: string, accessToken: string): Promise<unknown[]> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("Spotify listening data is unavailable");
  const page = (await response.json()) as { items?: unknown[] };
  return Array.isArray(page.items) ? page.items : [];
}

function albumFromTrackPage(items: unknown[], recent: boolean): SpotifyAlbumDto[] {
  const albums: SpotifyAlbumDto[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const track = recent ? (item as { track?: unknown }).track : item;
    if (!track || typeof track !== "object") continue;
    const album = (track as { album?: unknown }).album;
    if (!album || typeof album !== "object") continue;
    const raw = album as {
      id?: unknown;
      name?: unknown;
      release_date?: unknown;
      artists?: Array<{ name?: unknown }>;
      images?: Array<{ url?: unknown }>;
    };
    if (typeof raw.id !== "string" || typeof raw.name !== "string") continue;
    const cover = raw.images?.find((image) => typeof image.url === "string")?.url;
    const artist = raw.artists?.map((entry) => entry.name).filter((name): name is string => typeof name === "string").join(", ");
    const year = typeof raw.release_date === "string" ? Number.parseInt(raw.release_date.slice(0, 4), 10) : NaN;
    albums.push({
      id: raw.id,
      title: raw.name,
      artist: artist || "Unknown Artist",
      year: Number.isFinite(year) ? year : new Date().getUTCFullYear(),
      genre: "Pop",
      coverUrl: typeof cover === "string" ? cover : "",
      hues: [220, 260],
      tracks: [],
    });
  }
  return albums;
}

export async function getUnreviewedSpotifyAlbums(input: {
  userId: string;
  clientId: string;
  clientSecret: string;
  tokenEncryptionKey: string;
}): Promise<{ connected: boolean; albums: SpotifyAlbumDto[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: connection, error } = await supabaseAdmin
    .from("spotify_connections")
    .select("encrypted_tokens, expires_at")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error("Could not read Spotify connection");
  if (!connection) return { connected: false, albums: [] };

  let tokens = await decryptSpotifyTokens(connection.encrypted_tokens, input.tokenEncryptionKey);
  if (new Date(connection.expires_at).getTime() <= Date.now() + 60_000) {
    tokens = await refreshSpotifyTokens(tokens, input.clientId, input.clientSecret);
    const encryptedTokens = await encryptSpotifyTokens(tokens, input.tokenEncryptionKey);
    const { error: updateError } = await supabaseAdmin.from("spotify_connections").update({
      encrypted_tokens: encryptedTokens,
      expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", input.userId);
    if (updateError) throw new Error("Could not refresh Spotify connection");
  }

  const [topResult, recentResult] = await Promise.allSettled([
    tracksFromSpotify("https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50", tokens.accessToken),
    tracksFromSpotify("https://api.spotify.com/v1/me/player/recently-played?limit=50", tokens.accessToken),
  ]);
  if (topResult.status === "rejected" && recentResult.status === "rejected") {
    throw new Error("Spotify listening data is unavailable");
  }
  const items = [
    ...(topResult.status === "fulfilled" ? albumFromTrackPage(topResult.value, false) : []),
    ...(recentResult.status === "fulfilled" ? albumFromTrackPage(recentResult.value, true) : []),
  ];
  const reviewedResult = await supabaseAdmin.from("reviews").select("album_id").eq("user_id", input.userId);
  if (reviewedResult.error) throw new Error("Could not load your album reviews");
  const reviewedIds = new Set(reviewedResult.data.map((review) => review.album_id));
  const seen = new Set<string>();
  const albums = items.filter((album) => {
    if (seen.has(album.id) || reviewedIds.has(album.id)) return false;
    seen.add(album.id);
    return true;
  }).slice(0, 12);
  return { connected: true, albums };
}