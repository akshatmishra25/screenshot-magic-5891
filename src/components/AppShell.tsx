import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Search, User, LogOut, Disc3 } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useMyProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["profile", "me", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      return data;
    },
  });
}

export function Logo() {
  return (
    <Link to="/discover" className="flex items-center gap-2 font-display text-2xl font-bold">
      <Disc3 className="h-7 w-7 text-primary" /> Lyniv
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const navCls = "flex items-center gap-4 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground";
  const active = { className: "text-foreground bg-elevated" };

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-card p-6 md:flex">
        <Logo />
        <nav className="flex flex-col gap-1">
          <Link to="/discover" className={navCls} activeProps={active}><Home className="h-5 w-5" />Discover</Link>
          <Link to="/search" className={navCls} activeProps={active}><Search className="h-5 w-5" />Search</Link>
          {me && (
            <Link to="/u/$username" params={{ username: me.username }} className={navCls} activeProps={active}>
              <User className="h-5 w-5" />Profile
            </Link>
          )}
        </nav>
        <button onClick={signOut} className={`${navCls} mt-auto`}><LogOut className="h-5 w-5" />Sign out</button>
      </aside>

      <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 py-2 backdrop-blur md:hidden">
        {[
          { to: "/discover" as const, icon: Home, label: "Home" },
          { to: "/search" as const, icon: Search, label: "Search" },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-1 px-4 text-[11px] text-muted-foreground" activeProps={{ className: "text-foreground" }}>
            <Icon className="h-6 w-6" />{label}
          </Link>
        ))}
        {me && (
          <Link to="/u/$username" params={{ username: me.username }} className="flex flex-col items-center gap-1 px-4 text-[11px] text-muted-foreground" activeProps={{ className: "text-foreground" }}>
            <User className="h-6 w-6" />Profile
          </Link>
        )}
        <button onClick={signOut} className="flex flex-col items-center gap-1 px-4 text-[11px] text-muted-foreground">
          <LogOut className="h-6 w-6" />Exit
        </button>
      </nav>
    </div>
  );
}
