import { createAdminClient } from "../server";
import { getCurrentUser } from "./getCurrentUser";

export type UserProfile = {
  id: string;
  name: string;
  image_url: string | null;
  external_user_id: string | null;
};

export async function ensureUserProfileForCurrentUser(): Promise<
  UserProfile | null
> {
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await createAdminClient();

  const { data: existing, error } = await supabase
    .from("user_profile")
    .select("id, name, image_url, external_user_id")
    .or(`id.eq.${user.id},external_user_id.eq.${user.id}`)
    .maybeSingle();

  if (existing) {
    return existing as UserProfile;
  }

  if (error) {
    return null;
  }

  const nameFromEmail = user.email?.split("@")[0] ?? "User";

  const { data: created, error: insertError } = await supabase
    .from("user_profile")
    .insert({
      id: user.id,
      name: nameFromEmail,
      external_user_id: user.id,
    })
    .select("id, name, image_url, external_user_id")
    .single();

  if (insertError || !created) {
    return null;
  }

  return created as UserProfile;
}


