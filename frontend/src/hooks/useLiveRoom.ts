import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatMessage, GiftToast } from "../types";
import { uid } from "../data";

const MAX_MESSAGES = 30;
const MAX_TOASTS = 4;

export function useLiveRoom(roomId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<GiftToast[]>([]);
  const activeRef = useRef(roomId);
  activeRef.current = roomId;

  useEffect(() => {
    if (roomId === null) return;
    setMessages([]);
    setToasts([]);
  }, [roomId]);

  const pushMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: uid(),
      user: "@you",
      text,
      color: "#7f77dd",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
  }, []);

  const pushGiftToast = useCallback((emoji: string, name: string, count: number) => {
    const toast: GiftToast = { id: uid(), emoji, name, sender: "@you", count, timestamp: Date.now() };
    setToasts((prev) => [...prev.slice(-MAX_TOASTS + 1), toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3500);
  }, []);

  return { messages, toasts, pushMessage, pushGiftToast };
}
