// Cache token in memory
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiryTime) {
    return cachedToken;
  }

  // Call the secure same-origin proxy endpoint (POST only, returns { accessToken, expiresIn })
  const res = await fetch('/api/public/spotify-token', { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to fetch Spotify access token');
  }

  const data = await res.json();
  cachedToken = data.accessToken;
  // Expire 60 seconds early to avoid edge cases
  tokenExpiryTime = Date.now() + (data.expiresIn - 60) * 1000;
  return cachedToken!;
}

export async function searchSpotifyAlbums(query: string) {
  if (!query.trim()) return [];
  const token = await getSpotifyAccessToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?type=album&q=${encodeURIComponent(query)}&limit=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  
  return data.albums.items.map((album: any) => ({
    id: album.id,
    title: album.name,
    artist: album.artists.map((a: any) => a.name).join(', '),
    year: album.release_date ? album.release_date.split('-')[0] : '',
    coverUrl: album.images[0]?.url || '',
  }));
}

export async function getSpotifyAlbumDetails(id: string) {
  const token = await getSpotifyAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const album = await res.json();

  return {
    id: album.id,
    title: album.name,
    artist: album.artists.map((a: any) => a.name).join(', '),
    year: album.release_date ? album.release_date.split('-')[0] : '',
    coverUrl: album.images[0]?.url || '',
    tracks: album.tracks.items.map((track: any) => ({
      id: track.id,
      title: track.name,
      durationMs: track.duration_ms,
      trackNumber: track.track_number,
    })),
  };
}