import { Link } from "@tanstack/react-router";
import type { Album } from "@/lib/albums";
import { AlbumCover } from "./AlbumCover";

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Link
      to="/album/$id"
      params={{ id: album.id }}
      className="group block rounded-lg bg-card p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-elevated"
    >
      <div className="shadow-card transition-transform duration-300 group-hover:scale-[1.02]">
        <AlbumCover album={album} />
      </div>
      <p className="mt-3 truncate text-sm font-bold">{album.title}</p>
      <p className="truncate text-xs text-muted-foreground">{album.artist} · {album.year}</p>
    </Link>
  );
}
