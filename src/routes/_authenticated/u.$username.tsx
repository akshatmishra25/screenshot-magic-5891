import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { userReviews, type ReviewRow } from "@/lib/reviews";
import { musicSource, getAlbumSync } from "@/lib/albums";
import { TIERS, type TierId } from "@/lib/tiers";
import { AlbumCard } from "@/components/AlbumCard";
import { Button } from "@/components/ui/button";
import { disconnectSpotifyLink, getSpotifyLinkStatus, startSpotifyLink } from "@/lib/spotify-link.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Lyniv` },
      { name: "description", content: `Albums logged by @${params.username}, sorted into four vibe tiers.` },
      { property: "og:title", content: `@${params.username} — Lyniv` },
      { property: "og:description", content: `Albums logged by @${params.username}, sorted into four vibe tiers.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ReviewAlbumCard({ review }: { review: ReviewRow }) {
  const { data: album, isLoading } = useQuery({
    queryKey: ["album", review.album_id],
    queryFn: async () => {
      const fetchedAlbum = await musicSource.getAlbum(review.album_id);
      if (fetchedAlbum) return fetchedAlbum;
      return getAlbumSync(review.album_id) ?? null;
    },
    staleTime: 1000 * 60 * 30,
    enabled: Boolean(review.album_id),
  });

  if (isLoading) {
    return (
      <div className="aspect-square w-full animate-pulse rounded-lg bg-muted/60" />
    );
  }

  if (!album) return null;

  return <AlbumCard album={album} />;
}

function ProfilePage() {
  const { username } = Route.useParams();
  const search = useSearch({ strict: false });
  const { session } = useAuth();
  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });
  const p = profile.data;
  const reviews = useQuery({ queryKey: ["reviews", "user", p?.id], enabled: !!p, queryFn: () => userReviews(p!.id) });
  const [tab, setTab] = useState<TierId>("holy_grail");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const status = typeof search.spotify === "string" ? search.spotify : null;
    if (status === "connected") toast.success("Spotify account linked");
    if (status === "cancelled") toast.message("Spotify linking was cancelled");
    if (status === "expired") toast.error("That Spotify link expired. Please try again.");
    if (status === "error") toast.error("Spotify couldn't be linked. Please try again.");
    if (status) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("spotify");
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  }, [search.spotify]);

  if (profile.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="p-10">User not found.</div>;
  const isMe = session?.user.id === p.id;
  const name = p.display_name || p.username;
  const list = reviews.data ?? [];
  const activeList = list.filter((r) => r.tier === tab);

  return (
    <div>
      <div className="bg-hero px-4 pb-8 pt-10 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={name} className="h-36 w-36 rounded-full object-cover shadow-card" />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-elevated font-display text-5xl font-bold shadow-card">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest">Profile</p>
            <h1 className="mt-1 text-4xl font-bold md:text-6xl">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{p.username} · <span className="font-bold text-foreground">{list.length}</span> albums logged
            </p>
            {p.bio && <p className="mt-3 max-w-xl text-sm">{p.bio}</p>}
          </div>
          {isMe && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="self-start rounded-full border px-4 py-2 text-sm font-bold hover:border-foreground md:self-end"
            >
              {editing ? "Close" : "Edit profile"}
            </button>
          )}
        </div>
        {isMe && editing && <EditProfile profile={p} onDone={() => setEditing(false)} />}
      </div>

      <div className="px-4 md:px-10">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
          {TIERS.map((t) => {
            const n = list.filter((r) => r.tier === t.id).length;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition",
                  tab === t.id ? `${t.bg} text-primary-foreground` : "bg-elevated text-foreground hover:bg-muted"
                )}
              >
                {t.emoji} {t.name} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {activeList.map((r) => (
            <ReviewAlbumCard key={r.id} review={r} />
          ))}
        </div>

        {activeList.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">Nothing in this tier yet.</p>
        )}
      </div>
    </div>
  );
}

function EditProfile({
  profile,
  onDone,
}: {
  profile: { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null };
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [display, setDisplay] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: display.trim() || null,
          bio: bio.trim().slice(0, 160) || null,
          avatar_url: avatar.trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const input = "w-full rounded-md bg-elevated px-3 py-2 text-sm outline-none ring-primary focus:ring-2";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="mt-6 grid max-w-xl gap-3 rounded-xl bg-card p-4"
    >
      <input
        className={input}
        placeholder="Display name"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        maxLength={50}
      />
      <input
        className={input}
        placeholder="Avatar image URL"
        value={avatar}
        onChange={(e) => setAvatar(e.target.value)}
      />
      <textarea
        className={input}
        placeholder="Short bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={160}
        rows={2}
      />
      <SpotifyConnectionControl />
      <button
        disabled={save.isPending}
        className="rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}

function SpotifyConnectionControl() {
  const queryClient = useQueryClient();
  const startLink = useServerFn(startSpotifyLink);
  const disconnect = useServerFn(disconnectSpotifyLink);
  const { data: connection, isLoading } = useQuery({
    queryKey: ["spotify-connection"],
    queryFn: () => getSpotifyLinkStatus(),
  });
  const [linking, setLinking] = useState(false);
  const removeLink = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spotify-connection"] });
      await queryClient.invalidateQueries({ queryKey: ["spotify-recommendations"] });
      toast.success("Spotify disconnected");
    },
    onError: () => toast.error("Could not disconnect Spotify. Please try again."),
  });

  const connect = async () => {
    setLinking(true);
    try {
      const { authorizationUrl } = await startLink();
      window.location.assign(authorizationUrl);
    } catch {
      setLinking(false);
      toast.error("Could not start Spotify linking. Please try again.");
    }
  };

  return (
    <section className="grid gap-2 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-bold">Spotify listening</h3>
        {connection?.connected ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Connected{connection.displayName ? ` as ${connection.displayName}` : ""}. Listening suggestions appear in Discover.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Connect to find albums from your top and recent listening.</p>
        )}
      </div>
      {connection?.connected ? (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          disabled={removeLink.isPending}
          onClick={() => removeLink.mutate()}
        >
          {removeLink.isPending ? "Disconnecting…" : "Disconnect Spotify"}
        </Button>
      ) : (
        <Button type="button" className="w-fit" disabled={isLoading || linking} onClick={connect}>
          {linking ? "Opening Spotify…" : "Connect Spotify"}
        </Button>
      )}
    </section>
  );
}