import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Disc3 } from "lucide-react";
import { TIERS } from "@/lib/tiers";
import { musicSource, getAlbumSync } from "@/lib/albums";
import { AlbumCover } from "@/components/AlbumCover";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lyniv — Rate albums by vibe" },
      { name: "description", content: "Track the albums you love and sort them into four vibe tiers: Holy Grail, Active Rotation, Lofi Beats, Not my cup of tea." },
      { property: "og:title", content: "Lyniv — Rate albums by vibe" },
      { property: "og:description", content: "Track albums and sort them into four vibe tiers instead of stars." },
    ],
  }),
  component: Landing,
});

/** Featured albums: mock id doubles as the instant placeholder; query finds the live Spotify release. */
const SHOWCASE = [
  { mockId: "to-pimp-a-butterfly", query: "To Pimp a Butterfly Kendrick Lamar" },
  { mockId: "brat", query: "BRAT Charli xcx" },
  { mockId: "currents", query: "Currents Tame Impala" },
  { mockId: "ok-computer", query: "OK Computer Radiohead" },
  { mockId: "sos", query: "SOS SZA" },
  { mockId: "igor", query: "IGOR Tyler, The Creator" },
];

function Landing() {
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) navigate({ to: "/discover", replace: true }); }, [session, navigate]);

  // Live Spotify metadata for the featured covers; mock albums show instantly as placeholders.
  const showcaseQuery = useQuery({
    queryKey: ["landing-showcase"],
    queryFn: async () =>
      Promise.all(
        SHOWCASE.map(async (s) => {
          try {
            const results = await musicSource.search(s.query);
            const exact = results.find(
              (r) => r.title.toLowerCase().includes(s.mockId.replace(/-/g, " ")) && r.coverUrl,
            );
            return exact ?? results.find((r) => r.coverUrl) ?? null;
          } catch {
            return null;
          }
        }),
      ),
    staleTime: 1000 * 60 * 60,
  });

  const showcaseAlbums = SHOWCASE.map(
    (s, i) => showcaseQuery.data?.[i] ?? getAlbumSync(s.mockId)!,
  );

  return (
    <div className="bg-hero min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <span className="flex items-center gap-2 font-display text-2xl font-bold"><Disc3 className="h-7 w-7 text-primary" />Lyniv</span>
        <Link to="/auth" className="rounded-full bg-foreground px-5 py-2 text-sm font-bold text-background">Sign in</Link>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:px-12 md:py-20">
        <div>
          <h1 className="text-5xl font-bold leading-[1.05] md:text-7xl">Forget stars.<br /><span className="text-primary">Rate the vibe.</span></h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">Log every album you spin and drop it into one of four honest tiers.</p>
          <Link to="/auth" className="mt-8 inline-block rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground transition hover:scale-105">Start logging — it's free</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {showcaseAlbums.map((a, i) => (
            <div key={a.id} className={`transition-opacity duration-500 ${a.coverUrl ? "opacity-100" : "opacity-90"} ${i % 2 ? "translate-y-6" : ""}`}>
              <AlbumCover album={a} className="shadow-card" />
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-3 px-6 pb-20 sm:grid-cols-2 md:grid-cols-4 md:px-12">
        {TIERS.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.id} className="rounded-xl bg-card p-5">
              <Icon className={`h-7 w-7 ${t.text}`} />
              <p className="mt-3 font-display text-lg font-bold">{t.emoji} {t.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
