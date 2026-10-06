import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReviewRow } from "@/lib/reviews";
import { musicSource, getAlbumSync } from "@/lib/albums";
import { AlbumCover } from "./AlbumCover";
import { TierBadge } from "./TierBadge";

export function ReviewCard({ review, showAlbum = true }: { review: ReviewRow; showAlbum?: boolean }) {
  // Use TanStack Query to asynchronously fetch album details from musicSource (Spotify)
  const { data: album, isLoading } = useQuery({
    queryKey: ["album", review.album_id],
    queryFn: async () => {
      // Try async musicSource first (Spotify API)
      const fetchedAlbum = await musicSource.getAlbum(review.album_id);
      if (fetchedAlbum) return fetchedAlbum;
      // Fallback to static synchronous catalog if needed
      return getAlbumSync(review.album_id) ?? null;
    },
    // Keep in cache for 30 minutes to minimize API calls
    staleTime: 1000 * 60 * 30,
    enabled: showAlbum && Boolean(review.album_id),
  });

  const name = review.profiles?.display_name || review.profiles?.username || "Listener";

  return (
    <div className="flex w-full gap-3 rounded-lg bg-card p-3">
      {showAlbum && (
        <div className="w-16 shrink-0">
          {isLoading ? (
            // Skeleton loader while Spotify album artwork loads
            <div className="aspect-square w-full animate-pulse rounded-md bg-muted" />
          ) : album ? (
            <Link to="/album/$id" params={{ id: album.id }}>
              <AlbumCover album={album} />
            </Link>
          ) : (
            <div className="aspect-square w-full rounded-md bg-muted/40" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {review.profiles && (
            <Link
              to="/u/$username"
              params={{ username: review.profiles.username }}
              className="truncate text-sm font-bold hover:underline"
            >
              {name}
            </Link>
          )}
          <TierBadge tier={review.tier} />
        </div>

        {showAlbum && (
          <div className="mt-0.5">
            {isLoading ? (
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            ) : album ? (
              <p className="truncate text-xs text-muted-foreground">
                {album.title} · {album.artist}
              </p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">Unknown Album</p>
            )}
          </div>
        )}

        {review.body && (
          <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
            “{review.body}”
          </p>
        )}
      </div>
    </div>
  );
}