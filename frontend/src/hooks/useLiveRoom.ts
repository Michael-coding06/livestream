import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatMessage, GiftToast } from "../types";
import { uid } from "../data";

const MAX_MESSAGES = 30;
const MAX_TOASTS = 4;

type LeaderboardEntry = { Member: string; Score: number };

export type DonationNotice = {
  id: string;
  userName: string;
  value: number;
};

type WsPayload = {
  type?: string;
  commentJSON?: {
    username?: string;
    user_id?: number;
    content?: string;
    comment?: string;
  };
  leaderboard?: LeaderboardEntry[];
  donor?: string;
  gift_value?: number;
};

export function useLiveRoom(roomId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<GiftToast[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [donationNotice, setDonationNotice] = useState<DonationNotice | null>(null);
  const activeRef = useRef(roomId);
  activeRef.current = roomId;

  useEffect(() => {
    if (roomId === null) return;
    setMessages([]);
    setToasts([]);
    setLeaderboard([]);
    setDonationNotice(null);

    const ws = new WebSocket(`ws://localhost:8087/ws/room/${roomId}`);
    ws.onmessage = (event) => {
      try {
        const payload: WsPayload = JSON.parse(event.data);

        switch (payload.type) {
          case "comment": {
            const comment = payload.commentJSON;
            const text = (comment?.content ?? comment?.comment ?? "").trim();
            if (text) {
              pushIncomingMessage(comment?.username || String(comment?.user_id ?? "anonymous"), text);
            }
            break;
          }
          case "leaderboard-update":
            setLeaderboard(payload.leaderboard ?? []);
            if (payload.donor) {
              setDonationNotice({
                id: uid(),
                userName: payload.donor,
                value: payload.gift_value ?? 0,
              });
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error("Failed to parse room WebSocket message", error);
      }
    };

    return () => ws.close();
  }, [roomId]);

  useEffect(() => {
    if (!donationNotice) return;
    const timeoutId = window.setTimeout(() => setDonationNotice(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [donationNotice]);

  const pushIncomingMessage = useCallback((user: string, text: string) => {
    const msg: ChatMessage = {
      id: uid(),
      user,
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

  return { messages, toasts, leaderboard, donationNotice, pushGiftToast };
}
