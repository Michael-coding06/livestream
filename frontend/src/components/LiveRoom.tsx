import { useState, useRef, useCallback } from "react";
import type { Room, RoomStats, GiftType } from "../types";
import { GIFTS, fmtNum } from "../data";
import { ChatOverlay } from "./ChatOverlay";
import { GiftOverlay } from "./GiftOverlay";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { useLiveRoom } from "../hooks/useLiveRoom";
import useCreateComment from "../api/useCreateComment";
import useSendFlower from "../api/useSendFlower";

interface LiveRoomProps {
  room: Room;
  stats: RoomStats;
  onBack: () => void;
  onSendGift: (cost: number, count: number) => void;
  onLike: () => void;
  onComment: () => void;
}

function GiftChip({ gift, onSend }: { gift: GiftType; onSend: (g: GiftType) => void }) {
  return (
    <button
      onClick={() => onSend(gift)}
      style={{
        background: "#fffdf9",
        border: "1px solid #e2d2bf",
        borderRadius: 999, padding: "6px 10px", fontSize: 12,
        cursor: "pointer", color: "#6b4f35",
        whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
        fontFamily: "inherit", flexShrink: 0,
      }}
    >
      {gift.emoji} {gift.name}
      <span style={{ color: "#8b5a2b", fontSize: 10 }}>{gift.cost}c</span>
    </button>
  );
}

export function LiveRoom({ room, stats, onBack, onSendGift, onLike: _onLike, onComment }: LiveRoomProps) {
  const [commentText, setCommentText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, toasts, leaderboard, donationNotice, pushGiftToast } = useLiveRoom(room.id);
  const { createComment } = useCreateComment();
  const { sendFlower } = useSendFlower();

  const handleSendComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text) return;

    try {
      await createComment(text, room.id, "you");
      onComment();
      setCommentText("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send comment:", error);
    }
  }, [commentText, onComment, createComment, room.id]);

  const handleSendGift = useCallback(async (gift: GiftType) => {
    const count = Math.floor(Math.random() * 4) + 1;
    try {
      await sendFlower(room.id, count, "you");
      pushGiftToast(gift.emoji, gift.name, count);
      onSendGift(gift.cost, count);
    } catch (error) {
      console.error("Failed to send flower:", error);
    }
  }, [pushGiftToast, onSendGift, sendFlower, room.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 580, background: "#f4e8db", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, background: "#e7d4bb" }}>
        <span style={{ color: "#6b4f35" }}>{room.name}</span>

        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, padding: "10px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, transparent 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onBack} style={{ background: "#fffdf9", border: "1px solid #e2d2bf", color: "#6b4f35", padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              ← Back
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#4a2d1a" }}>{room.host}</span>
            <span style={{ background: "#8b5a2b", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3 }}>LIVE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#6b4f35" }}>
            <span>{fmtNum(stats.viewers)} watching</span>
            <span>{fmtNum(stats.comments)} comments</span>
          </div>
        </div>

        <ChatOverlay messages={messages} />
        <GiftOverlay toasts={toasts} />
        <LeaderboardPanel entries={leaderboard} />
        {donationNotice ? (
          <div style={{
            position: "absolute",
            left: "50%",
            top: 76,
            transform: "translateX(-50%)",
            padding: "8px 14px",
            borderRadius: 999,
            background: "#8b5a2b",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            boxShadow: "0 8px 20px rgba(74,45,26,0.2)",
            whiteSpace: "nowrap",
            zIndex: 2,
          }}>
            {donationNotice.userName} donated {donationNotice.value} flower{donationNotice.value === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>

      <div style={{ background: "#fffdf9", borderTop: "1px solid #e3d2bf", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {GIFTS.map((g) => (
            <GiftChip key={g.name} gift={g} onSend={handleSendGift} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
            placeholder="Write a comment"
            maxLength={80}
            style={{
              flex: 1, background: "#f9f3ea",
              border: "1px solid #e3d2bf",
              borderRadius: 999, padding: "8px 12px", fontSize: 13,
              color: "#4a2d1a", outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={handleSendComment} style={{ background: "#8b5a2b", border: "none", borderRadius: 999, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
