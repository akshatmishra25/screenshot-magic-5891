import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Disc3 } from "lucide-react";
import { TIERS } from "@/lib/tiers";
import { getAlbumSync } from "@/lib/albums";
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

const SHOWCASE = ["to-pimp-a-butterfly", "brat", "currents", "ok-computer", "sos", "igor"];

function Landing() {
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) navigate({ to: "/discover", replace: true }); }, [session, navigate]);

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
          {SHOWCASE.map((id, i) => {
            const a = getAlbumSync(id)!;
            return <div key={id} className={i % 2 ? "translate-y-6" : ""}><AlbumCover album={a} className="shadow-card" /></div>;
          })}
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
