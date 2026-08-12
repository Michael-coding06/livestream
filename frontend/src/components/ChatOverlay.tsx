import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";

interface ChatOverlayProps {
  messages: ChatMessage[];
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, animation: "slideIn 0.3s ease" }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: msg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>
        {msg.user[1]?.toUpperCase() ?? "?"}
      </div>
      <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 10, padding: "4px 9px", maxWidth: "90%" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#8b5a2b" }}>{msg.user} </span>
        <div style={{ fontSize: 12, color: "#4a2d1a", lineHeight: 1.4 }}>{msg.text}</div>
      </div>
    </div>
  );
}

export function ChatOverlay({ messages }: ChatOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div ref={ref} style={{ position: "absolute", bottom: 0, left: 0, width: "55%", padding: "0 10px 10px", maxHeight: "55%", overflowY: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 5, pointerEvents: "none" }}>
        {messages.slice(-5).map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>
    </>
  );
}
