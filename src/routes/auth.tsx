import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Disc3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Lyniv" },
      { name: "description", content: "Sign in or create your Lyniv account to start rating albums." },
      { property: "og:title", content: "Sign in — Lyniv" },
      { property: "og:description", content: "Sign in or create your Lyniv account to start rating albums." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (session) navigate({ to: "/discover", replace: true }); }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-md border bg-elevated px-4 py-3 text-sm outline-none ring-primary focus:ring-2";

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Disc3 className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold">{mode === "in" ? "Welcome back" : "Join Lyniv"}</h1>
          <p className="text-sm text-muted-foreground">Rate albums by vibe, not stars.</p>
        </div>
        {sent ? (
          <p className="text-center text-sm">Check <span className="font-bold">{email}</span> for a confirmation link, then come back to sign in.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => toast("Spotify sign-in is coming soon")}
              className="mb-4 w-full rounded-full bg-spotify py-3 text-sm font-bold text-primary-foreground transition hover:scale-[1.02]"
            >
              Continue with Spotify
            </button>
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submit} className="space-y-3">
              <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className={input} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button disabled={busy} className="w-full rounded-full bg-foreground py-3 text-sm font-bold text-background transition hover:scale-[1.02] disabled:opacity-50">
                {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "in" ? "New here?" : "Already have an account?"}{" "}
              <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="font-bold text-foreground hover:underline">
                {mode === "in" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
