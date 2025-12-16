"use client";

import { Message } from "@/services/supabase/actions/messages";
import { createClient } from "@/services/supabase/client";
import { ChatInput } from "@/services/supabase/components/components/chat-input";
import { ChatMessage } from "@/services/supabase/components/components/chat-message";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function RoomClient({
  room,
  user,
  messages,
}: {
  user: {
    id: string;
    name: string;
    image_url: string | null;
  };
  room: {
    id: string;
    name: string;
  };
  messages: Message[];
}) {
  const { connectedUsers, messages: liveMessages } = useRealtimeChat({
    roomId: room.id,
    userId: user.id,
    initialMessages: messages,
  });
  return (
    <div className="container mx-auto h-screen-with-header border border-y-0 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">{room.name}</h1>

          <p>{connectedUsers} users online</p>
        </div>
        <InviteUserModal roomId={room.id} />
      </div>
      <div
        className="grow overflow-y-auto flex-col-reverse"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        <div>
          {liveMessages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
        </div>
      </div>
      <ChatInput roomId={room.id} />
    </div>
  );
}

function InviteUserModal({ roomId }: { roomId: string }) {
  return null;
}

function useRealtimeChat({
  roomId,
  userId,
  initialMessages,
}: {
  roomId: string;
  userId: string;
  initialMessages: Message[];
}) {
  const [connectedUsers, setConnectedUsers] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  useEffect(() => {
    const supabase = createClient();
    let newChannel: RealtimeChannel | null = null;
    let cancelled = false;

    const token = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

    const setupChannel = () => {
      if (cancelled) return;

      newChannel = supabase.channel(`room:${roomId}:messages`, {
        config: {
          // Public channel; presence works with anon JWT
          presence: {
            key: userId,
          },
        },
      });

      newChannel
        .on("presence", { event: "sync" }, () => {
          if (!newChannel) return;
          setConnectedUsers(Object.keys(newChannel.presenceState()).length);
        })
        .on("broadcast", { event: "message_created" }, (payload) => {
          console.log("broadcast payload", payload);
          const record = payload.payload as {
            id: string;
            text: string;
            created_at: string;
            author_id: string;
            author_name: string;
            author_image_url: string | null;
          };
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: record.id,
              text: record.text,
              created_at: record.created_at,
              author_id: record.author_id,
              author: {
                name: record.author_name,
                image_url: record.author_image_url,
              },
            },
          ]);
        })
        .subscribe((status) => {
          console.log("realtime status", status);
          if (status !== "SUBSCRIBED" || !newChannel) {
            return;
          }
          console.log("realtime subscribed, tracking presence");

          newChannel.track({ userId });
        });
    };

    // If we have a Supabase JWT (anon key is a JWT), set it for Realtime first.
    if (token) {
      supabase.realtime
        .setAuth(token)
        .then(() => {
          setupChannel();
        })
        .catch(() => {
          // fall back to unauthenticated channel
          setupChannel();
        });
    } else {
      setupChannel();
    }
    console.log("setting up channel", roomId, userId);

    return () => {
      cancelled = true;
      if (!newChannel) return;
      newChannel.untrack({ userId });
      newChannel.unsubscribe();
    };
  }, [roomId, userId]);

  return { connectedUsers, messages };
}
