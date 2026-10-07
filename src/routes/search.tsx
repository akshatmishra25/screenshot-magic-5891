import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { musicSource } from "@/lib/albums";
import { AlbumCard } from "@/components/AlbumCard";
import { SearchBar } from "@/components/SearchBar";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Search albums — Lyniv" },
      { name: "description", content: "Find any album and drop it into a vibe tier." },
      { property: "og:title", content: "Search albums — Lyniv" },
      { property: "og:description", content: "Find any album and drop it into a vibe tier." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const results = useQuery({
    queryKey: ["search", q],
    queryFn: () => (q.trim() ? musicSource.search(q) : musicSource.trending()),
  });

  return (
    <AppShell>
      <div className="px-4 pt-8 md:px-10">
        <h1 className="mb-5 text-3xl font-bold">Search</h1>
        <SearchBar autoFocus value={q} onChange={(v) => navigate({ search: { q: v || undefined }, replace: true })} />
        <p className="mt-6 text-sm text-muted-foreground">{q ? `Results for “${q}”` : "Browse all albums"}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {results.data?.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
        {results.data?.length === 0 && <p className="mt-6 text-muted-foreground">No albums match that search.</p>}
      </div>
    </AppShell>
  );
}
