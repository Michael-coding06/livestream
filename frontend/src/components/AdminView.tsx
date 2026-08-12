import { useState } from "react";
import type { Room, RoomStats } from "../types";
import { fmtNum } from "../data";
import useCreateRoom from "../api/useCreateRoom";

interface AdminViewProps {
  rooms: Room[];
  stats: Record<number, RoomStats>;
  onJoinRoom: (room: Room) => void;
  onRoomCreated: (room: Room) => void;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "#fffdf9", border: "1px solid #e6d8c5", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "#8a6a4a", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: "#4a2d1a" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8b5a2b" }}>{sub}</div>
    </div>
  );
}

function RoomCard({ room, stats, onClick }: { room: Room; stats: RoomStats; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: "#fffdf9", border: "1px solid #e6d8c5", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
      <div style={{ height: 86, background: "#f1e3d2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#6b4f35" }}>
        {room.name}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4a2d1a", marginBottom: 6 }}>{room.host}</div>
        <div style={{ fontSize: 12, color: "#8a6a4a", marginBottom: 8 }}>{room.tag}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b4f35" }}>
          <span>{fmtNum(stats.comments)} comments</span>
          <span>{fmtNum(stats.gifts)} gifts</span>
        </div>
      </div>
    </div>
  );
}

export function AdminView({ rooms, stats, onJoinRoom, onRoomCreated }: AdminViewProps) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const { createRoom, loading } = useCreateRoom();

  const totalViewers = rooms.reduce((a, r) => a + (stats[r.id]?.viewers ?? 0), 0);
  const totalComments = rooms.reduce((a, r) => a + (stats[r.id]?.comments ?? 0), 0);
  const totalGifts = rooms.reduce((a, r) => a + (stats[r.id]?.gifts ?? 0), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) return;
    const created = await createRoom(name.trim(), host.trim());
    if (created) {
      onRoomCreated(created);
      setName("");
      setHost("");
    }
  };

  return (
    <div style={{ padding: 14 }}>
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #e3d2bf", fontFamily: "inherit" }} />
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #e3d2bf", fontFamily: "inherit" }} />
        <button type="submit" disabled={loading} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#8b5a2b", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
          {loading ? "Creating..." : "Create room"}
        </button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <SummaryCard label="Viewers" value={fmtNum(totalViewers)} sub="Live now" />
        <SummaryCard label="Comments" value={fmtNum(totalComments)} sub="Across rooms" />
        <SummaryCard label="Gifts" value={fmtNum(totalGifts)} sub="Sent today" />
      </div>

      <div style={{ fontSize: 12, color: "#8a6a4a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Live rooms
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} stats={stats[room.id] ?? { viewers: 0, comments: 0, gifts: 0, revenue: 0, likes: 0 }} onClick={() => onJoinRoom(room)} />
        ))}
      </div>
    </div>
  );
}
