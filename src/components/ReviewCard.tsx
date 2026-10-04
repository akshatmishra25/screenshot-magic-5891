import { Link } from "@tanstack/react-router";
import type { ReviewRow } from "@/lib/reviews";
import { getAlbumSync } from "@/lib/albums";
import { AlbumCover } from "./AlbumCover";
import { TierBadge } from "./TierBadge";

export function ReviewCard({ review, showAlbum = true }: { review: ReviewRow; showAlbum?: boolean }) {
  const album = getAlbumSync(review.album_id);
  const name = review.profiles?.display_name || review.profiles?.username || "Listener";
  return (
    <div className="flex w-full gap-3 rounded-lg bg-card p-3">
      {showAlbum && album && (
        <Link to="/album/$id" params={{ id: album.id }} className="w-16 shrink-0"><AlbumCover album={album} /></Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {review.profiles && (
            <Link to="/u/$username" params={{ username: review.profiles.username }} className="truncate text-sm font-bold hover:underline">{name}</Link>
          )}
          <TierBadge tier={review.tier} />
        </div>
        {showAlbum && album && <p className="truncate text-xs text-muted-foreground">{album.title} · {album.artist}</p>}
        {review.body && <p className="mt-1 line-clamp-3 text-sm text-foreground/85">“{review.body}”</p>}
      </div>
    </div>
  );
}
