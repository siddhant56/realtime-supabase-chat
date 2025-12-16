"use server";
import { getCurrentUser } from "../lib/getCurrentUser";
import { ensureUserProfileForCurrentUser } from "../lib/ensureUserProfile";
import { createAdminClient } from "../server";

export type Message = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author: {
    name: string;
    image_url: string | null;
  };
};

export async function sendMessage(data: {
  text: string;
  roomId: string;
}): Promise<
  { error: false; message: Message } | { error: true; message: string }
> {
  const user = await getCurrentUser();
  if (user == null) {
    return { error: true, message: "User Not Authenticated" };
  }

  if (!data.text.trim()) {
    return { error: true, message: "Cant be admin" };
  }

  const profile = await ensureUserProfileForCurrentUser();
  if (profile == null) {
    return { error: true, message: "Failed To Load User Profile" };
  }

  const supabase = await createAdminClient();

  const { data: membership, error: memberShipError } = await supabase
    .from("chat_room_member")
    .select("member_id")
    .eq("chat_room_id", data.roomId)
    .eq("member_id", profile.id)
    .single();

  console.log("membership", membership, data.roomId, user.id);

  if (memberShipError || !membership) {
    return { error: true, message: "User is not a member of chat room" };
  }

  const { data: message, error } = await supabase
    .from("message")
    .insert({
      text: data.text.trim(),
      chat_room_id: data.roomId,
      author_id: profile.id,
    })
    .select(
      "id , text, created_at, author_id, author:user_profile (name,image_url)"
    )
    .single();
  console.log("error", error);
  if (error) {
    return { error: true, message: "Failed To Send Message" };
  }

  return { error: false, message };
}
