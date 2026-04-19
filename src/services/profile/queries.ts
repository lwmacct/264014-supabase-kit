import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "../supabase/client";
import type { Profile } from "./types";

export const profileKeys = {
  all: ["profile"] as const,
  idle: ["profile", "idle"] as const,
  detail: (userId: string) => ["profile", userId] as const,
};

async function fetchMyProfile(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, email, display_name, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export function useMyProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? profileKeys.detail(userId) : profileKeys.idle,
    enabled: Boolean(userId),
    queryFn: () => fetchMyProfile(userId!),
  });
}
