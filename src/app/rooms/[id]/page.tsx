import { getCurrentUser } from "@/services/supabase/lib/getCurrentUser";
import { ensureUserProfileForCurrentUser } from "@/services/supabase/lib/ensureUserProfile";
import { createAdminClient } from "@/services/supabase/server";
import { notFound } from "next/navigation";
import { RoomClient } from "./_client";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (user == null) {
    return notFound();
  }

  const profile = await ensureUserProfileForCurrentUser();
  if (profile == null) {
    return notFound();
  }

  const [room, messages] = await Promise.all([
    getRoom(id, user.id),
    getMessages(id),
  ]);

  console.log("room logger", room);

  if (room == null) {
    return notFound();
  }
  return <RoomClient room={room} user={profile} messages={messages} />;
}

async function getRoom(id: string, userId: string) {
  const supabase = await createAdminClient();

  const { data: room, error } = await supabase
    .from("chat_room")
    .select("id, name, chat_room_member!inner ()")
    .eq("id", id)
    .eq("chat_room_member.member_id", userId)
    .single();

  if (error) {
    return null;
  }

  return room;
}

async function getMessages(roomId: string) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("message")
    .select(
      "id, text, created_at, author_id, author:user_profile (name, image_url)"
    )
    .eq("chat_room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return [];
  }

  return data;
}
