import type { Album } from "@/lib/albums";
import { cn } from "@/lib/utils";

export function AlbumCover({ album, className, large }: { album: Album; className?: string; large?: boolean }) {
  if (album.coverUrl) {
    return <img src={album.coverUrl} alt={`${album.title} cover`} className={cn("aspect-square w-full rounded-md object-cover", className)} />;
  }
  const [a, b] = album.hues;
  return (
    <div
      role="img"
      aria-label={`${album.title} cover`}
      className={cn("relative aspect-square w-full overflow-hidden rounded-md", className)}
      style={{ background: `linear-gradient(135deg, oklch(0.55 0.18 ${a}), oklch(0.25 0.12 ${b}))` }}
    >
      <div className="absolute -right-1/4 -top-1/4 h-3/4 w-3/4 rounded-full opacity-40 blur-2xl" style={{ background: `oklch(0.8 0.15 ${b})` }} />
      <div className={cn("absolute inset-x-0 bottom-0 p-3", large && "p-6")}>
        <p className={cn("font-display font-bold uppercase leading-none text-foreground/95", large ? "text-3xl" : "text-sm")}>{album.title}</p>
        <p className={cn("mt-1 text-foreground/70", large ? "text-base" : "text-[10px]")}>{album.artist}</p>
      </div>
    </div>
  );
}
