import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { musicSource } from "@/lib/albums";
import { albumReviews } from "@/lib/reviews";
import { TIERS, type TierId } from "@/lib/tiers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AlbumCover } from "@/components/AlbumCover";
import { ReviewCard } from "@/components/ReviewCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/album/$id")({
  head: () => ({
    meta: [
      { title: "Album — Lyniv" },
      { name: "description", content: "Tracklist, vibe tiers and reviews for this album on Lyniv." },
      { property: "og:title", content: "Album — Lyniv" },
      { property: "og:description", content: "Tracklist, vibe tiers and reviews for this album on Lyniv." },
    ],
  }),
  component: AlbumPage,
});

function AlbumPage() {
  const { id } = Route.useParams();
  const album = useQuery({ queryKey: ["album", id], queryFn: () => musicSource.getAlbum(id) });
  const reviews = useQuery({ queryKey: ["reviews", "album", id], queryFn: () => albumReviews(id) });

  if (album.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  const a = album.data;
  if (!a) return (
    <div className="p-10"><p>Album not found.</p><Link to="/search" className="text-primary">Back to search</Link></div>
  );

  const counts = TIERS.map((t) => ({ ...t, n: reviews.data?.filter((r) => r.tier === t.id).length ?? 0 }));
  const total = reviews.data?.length ?? 0;

  return (
    <div>
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, oklch(0.4 0.12 ${a.hues[0]}), transparent)` }}>
        <div className="flex flex-col gap-6 px-4 pb-8 pt-10 md:flex-row md:items-end md:px-10">
          <div className="w-56 shrink-0 shadow-card md:w-64"><AlbumCover album={a} large /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">{a.genre} · Album</p>
            <h1 className="mt-2 text-4xl font-bold md:text-6xl">{a.title}</h1>
            <p className="mt-3 text-sm"><span className="font-bold">{a.artist}</span> · {a.year} · {a.tracks.length} songs</p>
          </div>
        </div>
      </div>

      <div className="grid gap-10 px-4 md:px-10 lg:grid-cols-[1fr_380px]">
        <div className="order-2 lg:order-1">
          <h2 className="mb-3 text-xl font-bold">Tracklist</h2>
          <ol>
            {a.tracks.map((t, i) => (
              <li key={t} className="flex items-center gap-4 rounded-md px-3 py-2 text-sm transition-colors hover:bg-card">
                <span className="w-5 text-right text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="order-1 space-y-6 lg:order-2">
          <VoteWidget albumId={a.id} />
          {total > 0 && (
            <div className="rounded-xl bg-card p-4">
              <p className="mb-3 text-sm font-bold">Community vibe · {total} {total === 1 ? "rating" : "ratings"}</p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {counts.map((c) => <div key={c.id} className={c.bg} style={{ width: `${(c.n / total) * 100}%` }} />)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {counts.map((c) => <span key={c.id} className={c.text}>{c.emoji} {c.name}: {c.n}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-10 px-4 md:px-10">
        <h2 className="mb-3 text-xl font-bold">Reviews</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.data?.map((r) => <ReviewCard key={r.id} review={r} showAlbum={false} />)}
        </div>
        {total === 0 && <p className="text-sm text-muted-foreground">No reviews yet. Be the first.</p>}
      </section>
    </div>
  );
}

function VoteWidget({ albumId }: { albumId: string }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const mine = useQuery({
    queryKey: ["myReview", albumId, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("album_id", albumId).eq("user_id", uid!).maybeSingle();
      return data;
    },
  });
  const [tier, setTier] = useState<TierId | null>(null);
  const [body, setBody] = useState("");
  useEffect(() => {
    if (mine.data) { setTier(mine.data.tier); setBody(mine.data.body ?? ""); }
  }, [mine.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!tier || !uid) throw new Error("Pick a tier first");
      const { error } = await supabase.from("reviews").upsert(
        { user_id: uid, album_id: albumId, tier, body: body.trim() || null, updated_at: new Date().toISOString() },
        { onConflict: "user_id,album_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vibe logged");
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["myReview", albumId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl bg-card p-4">
      <p className="mb-3 font-display text-lg font-bold">{mine.data ? "Your vibe" : "Drop it in a tier"}</p>
      <div className="grid grid-cols-2 gap-2">
        {TIERS.map((t) => {
          const Icon = t.icon;
          const on = tier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all hover:scale-[1.02]",
                on ? `${t.border} ${t.soft}` : "border-transparent bg-elevated",
              )}
            >
              <Icon className={cn("h-5 w-5", t.text)} />
              <span className="text-sm font-bold">{t.emoji} {t.name}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{t.blurb}</span>
            </button>
          );
        })}
      </div>
      <div className="relative mt-3">
        <textarea
          value={body}
          maxLength={280}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say it in a tweet…"
          rows={3}
          className="w-full resize-none rounded-lg bg-elevated p-3 text-sm outline-none ring-primary focus:ring-2"
        />
        <span className="absolute bottom-3 right-3 text-[10px] text-muted-foreground">{body.length}/280</span>
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={!tier || save.isPending}
        className="mt-3 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-40"
      >
        {save.isPending ? "Saving…" : mine.data ? "Update review" : "Log it"}
      </button>
    </div>
  );
}
