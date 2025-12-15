"use client";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { SendIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { sendMessage } from "../../actions/messages";

export function ChatInput({ roomId }: { roomId: string }) {
  console.log("Room Id", roomId);
  const [message, setMessage] = useState("");

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();

    const text = message.trim();
    if (!message) {
      return;
    }
    setMessage("");
    const result = await sendMessage({ text, roomId });

    if (result.error) {
      toast.error(result.message);
    } else {
      //   result.message
    }
  }
  return (
    <form onSubmit={handleSubmit} className="p-3">
      <InputGroup>
        <InputGroupTextarea
          placeholder="Type your message"
          value={message}
          className="field-sizing-content min-h-auto"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            aria-label="send"
            title="Send"
            size="icon-sm"
          >
            <SendIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
