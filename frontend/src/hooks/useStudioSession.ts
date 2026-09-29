import { useCallback, useEffect, useRef, useState } from "react";
import useCreateComment from "../api/useCreateComment";
import useSendFlower from "../api/useSendFlower";
import type { ChatMessage, LeaderboardEntry, Room } from "../types";
import type { DonationNotice } from "./useLiveRoom";

const backendUrl = (import.meta.env.VITE_BACKEND_SERVICE_URL || "http://localhost:8087").replace(/\/$/, "");
const websocketUrl = backendUrl.replace(/^http/, "ws");

const AUTO_USERS = ["alex_dev", "maria_s", "coder99", "sophie_k", "techguru42"];
const AUTO_TEXT = [
  "Great stream!",
  "Love this walkthrough",
  "Can you share the repo?",
  "Audio is crystal clear",
  "Huge value here",
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeText(v: string) {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}

type WsCommentPayload = {
  type?: string;
  room_id?: number;
  user_id?: number;
  username?: string;
  content?: string;
  comment?: string;
  commentJSON?: {
    room_id?: number;
    user_id?: number;
    username?: string;
    content?: string;
    comment?: string;
  };
  leaderboard?: LeaderboardEntry[];
  user_name?: string;
  donation_value?: number;
};

function mergeGift(entries: LeaderboardEntry[], gift: WsCommentPayload): LeaderboardEntry[] {
  const userName = gift.user_name?.trim();
  if (!userName) return entries;

  const existing = entries.find((entry) => entry.user_name === userName);
  const updated = existing
    ? { ...existing, donation_value: existing.donation_value + (gift.donation_value ?? 0)}
    : {
        room_id: gift.room_id ?? 0,
        user_id: gift.user_id ?? 0,
        user_name: userName,
        donation_value: gift.donation_value ?? 0,
      };

  return [...entries.filter((entry) => entry.user_name !== userName), updated]
    .sort((a, b) => b.donation_value - a.donation_value) // if b.donation_value > a.donation_value => swap(a,b)
    .slice(0, 10);
}

export function useStudioSession(
  room: Room | null,
  onUpdateRoom: (roomId: number, patch: Partial<Room>) => void
) {
  const { createComment } = useCreateComment();
  const { sendFlower } = useSendFlower();

  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [donationNotice, setDonationNotice] = useState<DonationNotice | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [username, setUsername] = useState("you");
  const [copied, setCopied] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [giftBusy, setGiftBusy] = useState(false);

  const copyTimerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Recent fingerprints from WS history/live to avoid duplicate renders
  const recentFingerprintsRef = useRef<Map<string, number>>(new Map());
  // Pending optimistic messages keyed by normalized text
  const pendingMineRef = useRef<Set<string>>(new Set());

  const pushChatMessage = useCallback((user: string, text: string, color = "#7c3aed") => {
    setChatMessages((prev) => [
      ...prev.slice(-10),
      { id: makeId(), user, text, color, timestamp: Date.now() },
    ]);
  }, []);

  useEffect(() => {
    if (!room?.id) return;

    // Clear state when switching room
    setIsLive(false);
    setDuration(0);
    setViewerCount(0);
    setChatMessages([]);
    setLeaderboard([]);
    setDonationNotice(null);
    setChatInput("");
    setCommentBusy(false);
    setGiftBusy(false);
    recentFingerprintsRef.current.clear();
    pendingMineRef.current.clear();

    const ws = new WebSocket(`${websocketUrl}/ws/room/${room.id}`);

    console.log("roomid: ", room.id)

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("ws connected room", room.id);
    };

    ws.onmessage = (event) => {
      try {
        console.log("there's a new event: ", event)
        const payload: WsCommentPayload = JSON.parse(event.data);

        switch (payload.type) {
          case "comment":
            break;

          case "leaderboard-update":
            setLeaderboard(payload.leaderboard ?? []);
            break;

          case "gift":
            setLeaderboard((entries) => mergeGift(entries, payload));
            setDonationNotice({
              id: makeId(),
              userName: payload.user_name ?? "anonymous",
              value: payload.donation_value ?? 0,
            });
            break;

          default:
            console.warn("Unknown event type:", payload.type);
        }

        const comment = payload.commentJSON ?? payload;
        const text = (comment.content ?? comment.comment ?? "").trim();
        if (!text) return;

        const user = comment.username?.trim() || (comment.user_id != null ? String(comment.user_id) : "randomUser");
        const roomToken = String(comment.room_id ?? room.id);
        const fp = `${roomToken}|${user}|${normalizeText(text)}`;

        // 1) Drop duplicates from history/live replay
        const now = Date.now();
        const prevSeen = recentFingerprintsRef.current.get(fp);
        if (prevSeen && now - prevSeen < 5000) {
          return;
        }
        recentFingerprintsRef.current.set(fp, now);

        // Lightweight cleanup of old fingerprints
        for (const [k, t] of recentFingerprintsRef.current) {
          if (now - t > 15000) recentFingerprintsRef.current.delete(k);
        }

        // 2) If this is likely my own optimistic message, drop optimistic duplicate
        const normalized = normalizeText(text);
        if (pendingMineRef.current.has(normalized)) {
          pendingMineRef.current.delete(normalized);
          setChatMessages((prev) => {
            const idx = prev.findIndex(
              (m) => m.user === "you" && normalizeText(m.text) === normalized
            );
            if (idx === -1) return prev;
            const copy = [...prev];
            copy.splice(idx, 1);
            return copy;
          });
        }

        pushChatMessage(user, text);
      } catch (err) {
        console.error("ws parse error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("ws error", err);
    };

    ws.onclose = () => {
      console.log("ws closed room", room.id);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [room?.id, pushChatMessage]);

  useEffect(() => {
    if (!donationNotice) return;
    const timeoutId = window.setTimeout(() => setDonationNotice(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [donationNotice]);

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => setDuration((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) {
      setViewerCount(0);
      return;
    }
    setViewerCount(1);
    const id = window.setInterval(() => {
      setViewerCount((v) => Math.max(1, v + (Math.random() > 0.5 ? 1 : -1)));
    }, 4000);
    return () => window.clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => {
      const user = AUTO_USERS[Math.floor(Math.random() * AUTO_USERS.length)];
      const text = AUTO_TEXT[Math.floor(Math.random() * AUTO_TEXT.length)];
      pushChatMessage(user, text);
    }, 3500);
    return () => window.clearInterval(id);
  }, [isLive, pushChatMessage]);

  useEffect(() => {
    if (!room) return;
    onUpdateRoom(room.id, { viewers: viewerCount });
  }, [viewerCount, onUpdateRoom, room?.id]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const goLive = useCallback(() => {
    if (!room) return;
    setIsLive(true);
    setDuration(0);
    onUpdateRoom(room.id, { status: "live", viewers: 0 });
  }, [onUpdateRoom, room]);

  const endLive = useCallback(() => {
    if (!room) return;
    setIsLive(false);
    setDuration(0);
    setViewerCount(0);
    onUpdateRoom(room.id, { status: "offline", viewers: 0 });
  }, [onUpdateRoom, room]);

  const copyLink = useCallback(async () => {
    if (!room) return;
    const path = `/livestream-room?roomId=${room.id}`;
    const url = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [room]);

  const submitChat = useCallback(async () => {
    if (!room) return;
    const text = chatInput.trim();
    const name = username.trim();
    if (!text || !name || commentBusy) return;

    setCommentBusy(true);
    try {
      const norm = normalizeText(text);
      pendingMineRef.current.add(norm);

      await createComment(text, room.id, name);
      setChatInput("");
    } catch (err) {
      console.error("Failed to create comment", err);
      // Rollback optimistic marker only; message can remain as local feedback
      pendingMineRef.current.delete(normalizeText(text));
    } finally {
      setCommentBusy(false);
    }
  }, [commentBusy, chatInput, createComment, room, username]);

  const sendGift = useCallback(async (count: number) => {
    if (!room || giftBusy) return;
    setGiftBusy(true);
    try {
      await sendFlower(room.id, count, username);
    } catch (err) {
      console.error("Failed to send flower", err);
    } finally {
      setGiftBusy(false);
    }
  }, [giftBusy, room, sendFlower, username]);

  return {
    isLive,
    duration,
    viewerCount,
    chatMessages,
    leaderboard: leaderboard ?? [],
    donationNotice,
    chatInput,
    username,
    copied,
    commentBusy,
    giftBusy,
    setChatInput,
    setUsername,
    goLive,
    endLive,
    copyLink,
    submitChat,
    sendGift,
  };
}