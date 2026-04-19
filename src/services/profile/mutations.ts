import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "../supabase/client";
import { profileKeys } from "./queries";
import type { Profile, ProfileUpdateInput } from "./types";

async function upsertMyProfile(
  userId: string,
  email: string,
  input: ProfileUpdateInput,
) {
  const client = getSupabaseClient();
  const payload = {
    id: userId,
    email,
    display_name: input.display_name ?? null,
    ...(Object.prototype.hasOwnProperty.call(input, "avatar_url")
      ? { avatar_url: input.avatar_url ?? null }
      : {}),
  };

  const { data, error } = await client
    .from("profiles")
    .upsert(payload)
    .select("id, email, display_name, avatar_url, created_at, updated_at")
    .single<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function useUpdateMyProfileMutation(
  userId: string | null,
  email: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProfileUpdateInput) => {
      if (!userId || !email) {
        throw new Error("当前账户状态异常，请重新登录后重试。");
      }

      return upsertMyProfile(userId, email, input);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(profile.id), profile);
    },
  });
}
