import { useState, useCallback, useEffect } from "react";
import type { Mode, Room } from "./types";
import { useRoomStats } from "./hooks/useRoomStats";
import { AdminView } from "./components/AdminView";
import { UserView } from "./components/UserView";
import api from "./api/api";

export default function App() {
  const [mode, setMode] = useState<Mode>("admin");
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { stats, bumpGift, bumpLike, bumpComment } = useRoomStats(rooms);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await api.get("/rooms");
        const fetchedRooms = (res.data.rooms ?? []).map((room: any) => ({
          id: Number(room.room_id ?? room.id ?? 0),
          name: room.name,
          host: room.host,
          emoji: "",
          bgClass: "",
          bgColor: "",
          tag: "",
          accentColor: "",
        }));
        setRooms(fetchedRooms);
      } catch (error) {
        console.error("Failed to load rooms", error);
      }
    };

    loadRooms();
  }, []);

  const handleJoinFromAdmin = useCallback((room: Room) => {
    setPendingRoom(room);
    setMode("user");
  }, []);

  const handleSwitchMode = useCallback((m: Mode) => {
    if (m !== "user") setPendingRoom(null);
    setMode(m);
  }, []);

  const handleRoomCreated = useCallback((room: Room) => {
    setRooms((prev) => [room, ...prev]);
  }, []);

  return (
    <div style={{ width: "100%", minHeight: 600, display: "flex", flexDirection: "column", fontFamily: "Segoe UI, Arial, sans-serif", background: "#f7efe7", color: "#3f2818" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "#fffdf9",
        borderBottom: "1px solid #e3d2bf", borderRadius: "12px 12px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5a2b" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "#4a2d1a" }}>
            LiveStream Studio
          </span>
        </div>

        <div style={{
          display: "flex", background: "#f5ebde", borderRadius: 8,
          padding: 3, border: "1px solid #e0d0bd",
        }}>
          {(["admin", "user"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleSwitchMode(m)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 13,
                cursor: "pointer", border: "none", fontFamily: "inherit",
                background: mode === m ? "#8b5a2b" : "transparent",
                color: mode === m ? "#fff" : "#6b4f35",
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {m === "admin" ? "Admin" : "User"}
            </button>
          ))}
        </div>
      </div>

      {mode === "admin" ? (
        <AdminView rooms={rooms} stats={stats} onJoinRoom={handleJoinFromAdmin} onRoomCreated={handleRoomCreated} />
      ) : (
        <UserView
          rooms={rooms}
          stats={stats}
          initialRoom={pendingRoom}
          onSendGift={bumpGift}
          onLike={bumpLike}
          onComment={bumpComment}
        />
      )}
    </div>
  );
}
