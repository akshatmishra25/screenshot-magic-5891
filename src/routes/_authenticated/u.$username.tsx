import { createFileRoute } from "@tanstack/react-router";
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
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });
  const p = profile.data;
  const isMe = session?.user.id === p?.id;
  const getStatus = useServerFn(getSpotifyLinkStatus);
  const spotifyConnection = useQuery({
    queryKey: ["spotify-connection", session?.user.id],
    queryFn: () => getStatus(),
    enabled: Boolean(session?.user.id && isMe),
  });
  const reviews = useQuery({ queryKey: ["reviews", "user", p?.id], enabled: !!p, queryFn: () => userReviews(p!.id) });
  const [tab, setTab] = useState<TierId>("holy_grail");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("spotify");
    if (status === "connected") {
      toast.success("Spotify account linked");
      queryClient.invalidateQueries({ queryKey: ["spotify-connection"] });
      queryClient.invalidateQueries({ queryKey: ["spotify-recommendations"] });
    }
    if (status === "cancelled") toast.message("Spotify linking was cancelled");
    if (status === "expired") toast.error("That Spotify link expired. Please try again.");
    if (status === "error") {
      toast.error("Spotify couldn't be linked. Please try again.");
    }
    if (status) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("spotify");
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  }, [queryClient]);

  if (profile.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="p-10">User not found.</div>;
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
            {isMe && (
              <SpotifyProfileBadge
                connection={spotifyConnection.data}
                isLoading={spotifyConnection.isLoading}
              />
            )}
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
      <button
        disabled={save.isPending}
        className="rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}

function SpotifyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.674.466-1.027.252-2.814-1.72-6.356-2.109-10.528-1.156-.402.092-.801-.16-.893-.562-.092-.403.16-.802.562-.894 4.571-1.045 8.492-.598 11.634 1.333.353.214.466.674.252 1.027zm1.465-3.259c-.27.441-.847.58-1.288.31-3.221-1.98-8.132-2.553-11.942-1.396-.498.151-1.025-.133-1.176-.63-.151-.498.133-1.025.63-1.177 4.357-1.322 9.776-.682 13.466 1.585.441.27.58.847.31 1.308zm.126-3.41c-3.863-2.294-10.237-2.506-13.914-1.39-.593.18-1.223-.153-1.403-.746-.18-.593.153-1.223.746-1.403 4.23-1.284 11.274-1.037 15.714 1.6c.532.316.707 1.008.392 1.54-.316.533-1.008.708-1.535.399z" />
    </svg>
  );
}

function SpotifyProfileBadge({
  connection,
  isLoading,
}: {
  connection?: { connected: boolean; displayName?: string | null };
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const startLink = useServerFn(startSpotifyLink);
  const disconnect = useServerFn(disconnectSpotifyLink);
  const [linking, setLinking] = useState(false);

  const removeLink = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spotify-connection"] });
      await queryClient.invalidateQueries({ queryKey: ["spotify-recommendations"] });
      toast.success("Spotify disconnected");
    },
    onError: (err) => {
      console.error("Could not disconnect Spotify:", err);
      toast.error("Could not disconnect Spotify. Please try again.");
    },
  });

  const connect = async () => {
    setLinking(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const { authorizationUrl } = await startLink({ data: { origin } });
      window.location.assign(authorizationUrl);
    } catch (err) {
      console.error("Could not start Spotify linking:", err);
      setLinking(false);
      const message = err instanceof Error ? err.message : "Could not start Spotify linking. Please try again.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/40 px-3 py-1 text-xs text-muted-foreground animate-pulse">
        <SpotifyIcon className="h-3.5 w-3.5 opacity-50" />
        <span>Checking Spotify…</span>
      </div>
    );
  }

  if (connection?.connected) {
    return (
      <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-foreground backdrop-blur-sm shadow-sm">
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <SpotifyIcon className="h-3.5 w-3.5 fill-[#1DB954]" />
          <span>Spotify connected</span>
        </span>
        {connection.displayName && (
          <>
            <span className="text-muted-foreground/40">•</span>
            <span className="max-w-[150px] truncate text-muted-foreground font-normal" title={connection.displayName}>
              {connection.displayName}
            </span>
          </>
        )}
        <span className="mx-0.5 h-3 w-px bg-border/60" />
        <button
          type="button"
          onClick={() => removeLink.mutate()}
          disabled={removeLink.isPending}
          className="text-[11px] font-semibold text-muted-foreground transition hover:text-destructive disabled:opacity-50"
          title="Disconnect Spotify account"
        >
          {removeLink.isPending ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={connect}
        disabled={linking}
        className="group inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-3.5 py-1.5 text-xs font-bold text-black shadow-sm transition hover:bg-[#1ed760] hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
      >
        <SpotifyIcon className="h-3.5 w-3.5 fill-black transition group-hover:rotate-12" />
        <span>{linking ? "Connecting to Spotify…" : "Connect Spotify"}</span>
      </button>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Sync listening rotation on Discover
      </span>
    </div>
  );
}