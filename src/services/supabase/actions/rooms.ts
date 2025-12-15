"use server";

import { createRoomSchema } from "@/services/schemas/rooms";
import z from "zod";
import { getCurrentUser } from "../lib/getCurrentUser";
import { createAdminClient, createClient } from "../server";
import { redirect } from "next/navigation";

export async function createRoom(unsafeData: z.infer<typeof createRoomSchema>) {
  const { success, data } = createRoomSchema.safeParse(unsafeData);

  if (!success) {
    return { error: true, message: "invalid" };
  }

  const user = await getCurrentUser();

  if (user === null) {
    return { error: true, message: "User Not Authenticated" };
  }

  const supabase = await createAdminClient();

  const { data: room, error: roomError } = await supabase
    .from("chat_room")
    .insert({ name: data.name, is_public: data.isPublic })
    .select("id")
    .single();

  if (roomError || room == null) {
    return { error: true, message: "Failed To Create Room" };
  }

  const { error: memberShipError } = await supabase
    .from("chat_room_member")
    .insert({ chat_room_id: room.id, member_id: user.id });

  if (memberShipError) {
    return { error: true, message: "Failed To Add User To Room" };
  }

  redirect(`/rooms/${room.id}`);
}
