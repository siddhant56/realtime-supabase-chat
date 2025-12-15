"use client";
import { ActionButton } from "@/components/ui/action-button";
import { ComponentProps, ReactNode } from "react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { createClient } from "../../client";
import { error } from "console";
import { useRouter } from "next/navigation";

export function LeaveRoomButton({
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

    const { error } = await supabase
      .from("chat_room_member")
      .delete()
      .eq("chat_room_id", roomId)
      .eq("member_id", user.id);

    if (error) {
      return { error: true, message: "Failed to leave rooom" };
    }

    router.refresh();

    return { error: false };
  }

  return (
    <ActionButton {...props} action={joinRoom}>
      Leave
    </ActionButton>
  );
}
