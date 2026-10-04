import { supabase } from "@/integrations/supabase/client";

export type ReviewRow = {
  id: string;
  user_id: string;
  album_id: string;
  tier: "holy_grail" | "active_rotation" | "lofi_beats" | "sonic_pollution";
  body: string | null;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

const SELECT = "*, profiles(username, display_name, avatar_url)";

export async function recentReviews(limit = 20) {
  const { data, error } = await supabase.from("reviews").select(SELECT).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as unknown as ReviewRow[];
}

export async function albumReviews(albumId: string) {
  const { data, error } = await supabase.from("reviews").select(SELECT).eq("album_id", albumId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ReviewRow[];
}

export async function userReviews(userId: string) {
  const { data, error } = await supabase.from("reviews").select(SELECT).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ReviewRow[];
}
