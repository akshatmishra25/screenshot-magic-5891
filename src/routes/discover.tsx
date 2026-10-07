import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { musicSource } from "@/lib/albums";
import { recentReviews } from "@/lib/reviews";
import { useAuth } from "@/lib/auth";
import { AlbumCard } from "@/components/AlbumCard";
import { ReviewCard } from "@/components/ReviewCard";
import { SearchBar } from "@/components/SearchBar";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Lyniv" },
      { name: "description", content: "Trending albums and the latest vibe-tier reviews on Lyniv." },
      { property: "og:title", content: "Discover — Lyniv" },
      { property: "og:description", content: "Trending albums and the latest vibe-tier reviews on Lyniv." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => musicSource.trending() });
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
