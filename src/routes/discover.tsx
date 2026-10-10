import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { musicSource } from "@/lib/albums";
import { recentReviews } from "@/lib/reviews";
import { useAuth } from "@/lib/auth";
import { AlbumCard } from "@/components/AlbumCard";
import { ReviewCard } from "@/components/ReviewCard";
import { SearchBar } from "@/components/SearchBar";
import { AppShell, useMyProfile } from "@/components/AppShell";
import { getSpotifyListeningRecommendations } from "@/lib/spotify-link.functions";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Lyniv" },
      { name: "description", content: "Trending albums and the latest vibe-tier reviews on Lyniv." },
      { property: "og:title", content: "Discover — Lyniv" },
      { property: "og:description", content: "Trending albums and the latest vibe-tier reviews on Lyniv." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;
  const { data: profile } = useMyProfile();
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => musicSource.trending() });
  const fetchRecommendations = useServerFn(getSpotifyListeningRecommendations);
  const recommendations = useQuery({
    queryKey: ["spotify-recommendations", userId],
    queryFn: () => fetchRecommendations({ data: {} }),
    enabled: Boolean(userId) && !authLoading,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const reviews = useQuery({
    queryKey: ["reviews", "recent", userId ?? "guest"],
    queryFn: () => recentReviews(20, userId),
    enabled: !authLoading,
  });

  return (
    <AppShell>
      <div className="bg-hero">
        <div className="px-4 pt-8 md:px-10">
          <h1 className="mb-5 text-3xl font-bold md:text-5xl">What are you spinning?</h1>
          <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/search", search: { q } }); }}>
            <SearchBar value={q} onChange={setQ} />
          </form>
        </div>

        <section className="mt-10">
          <div className="mb-3 px-4 md:px-10">
            <h2 className="text-xl font-bold">Top Reviews</h2>
            <p className="text-sm text-muted-foreground">
              See what the community is listening to and logging right now.
            </p>
          </div>
          <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-2 md:px-10">
            {reviews.data?.length ? (
              reviews.data.map((r) => (
                <div key={r.id} className="w-80 shrink-0"><ReviewCard review={r} /></div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{reviews.isLoading ? "Loading…" : "No reviews yet — rate an album to start the feed."}</p>
            )}
          </div>
        </section>

        {userId && (
          <section className="mt-10" aria-labelledby="spotify-rotation-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-4 md:px-10">
              <div>
                <h2 id="spotify-rotation-heading" className="text-xl font-bold">From your Spotify rotation</h2>
                <p className="text-sm text-muted-foreground">Albums from your top and recent listening that you haven’t reviewed.</p>
              </div>
              {recommendations.data?.connected && (
                <span className="text-xs font-semibold text-muted-foreground">Based on your listening</span>
              )}
            </div>
            {!recommendations.isLoading && !recommendations.isError && !recommendations.data?.connected && (
              <div className="mx-4 flex flex-wrap items-center justify-between gap-3 border-y border-border px-0 py-4 md:mx-10">
                <p className="text-sm text-muted-foreground">Connect Spotify to see albums you’ve been playing.</p>
                {profile && (
                  <Link to="/u/$username" params={{ username: profile.username }} className="text-sm font-bold text-primary hover:underline">
                    Connect in your profile
                  </Link>
                )}
              </div>
            )}
            {recommendations.isLoading && (
              <p className="px-4 text-sm text-muted-foreground md:px-10">Checking your listening…</p>
            )}
            {recommendations.isError && (
              <p className="px-4 text-sm text-muted-foreground md:px-10">Your Spotify listening is temporarily unavailable.</p>
            )}
            {recommendations.data?.connected && recommendations.data.albums.length > 0 && (
              <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-2 md:px-10">
                {recommendations.data.albums.map((album) => (
                  <div key={album.id} className="w-40 shrink-0 md:w-48"><AlbumCard album={album} /></div>
                ))}
              </div>
            )}
            {recommendations.data?.connected && recommendations.data.albums.length === 0 && (
              <p className="px-4 text-sm text-muted-foreground md:px-10">You’ve reviewed everything in this listening mix.</p>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 px-4 text-xl font-bold md:px-10">Trending Albums</h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-2 md:px-10">
            {trending.data?.map((a) => (
              <div key={a.id} className="w-40 shrink-0 md:w-48"><AlbumCard album={a} /></div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
