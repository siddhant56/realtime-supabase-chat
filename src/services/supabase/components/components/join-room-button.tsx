"use client";
import { ActionButton } from "@/components/ui/action-button";
import { ComponentProps, ReactNode } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { createClient } from "../../client";
import { error } from "console";
import { useRouter } from "next/navigation";

export function JoinRoomButton({
  children,
  roomId,
  ...props
}: Omit<ComponentProps<typeof ActionButton>, "action"> & { roomId: string }) {
  const { user } = useCurrentUser();
  const router = useRouter();
  async function joinRoom() {
    if (user == null) {
      return { error: true, message: "User not logged in" };
    }

    const supabase = createClient();

    const { error } = await supabase.from("chat_room_member").insert({
      chat_room_id: roomId,
      member_id: user.id,
    });

    if (error) {
      return { error: true, message: "Failed to join rooom" };
    }

    router.refresh();
    router.push(`/rooms/${roomId}`);

    return { error: false };
  }

  return <ActionButton {...props} action={joinRoom}></ActionButton>;
}
