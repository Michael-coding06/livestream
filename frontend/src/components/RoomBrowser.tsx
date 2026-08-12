import type { Room, RoomStats } from "../types";
import { fmtNum } from "../data";

interface RoomBrowserProps {
  rooms: Room[];
  stats: Record<number, RoomStats>;
  onJoin: (room: Room) => void;
}

function BrowserCard({ room, stats, onJoin }: { room: Room; stats: RoomStats; onJoin: () => void }) {
  return (
    <div onClick={onJoin} style={{ background: "#fffdf9", border: "1px solid #e6d8c5", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
      <div style={{ height: 92, background: "#f2e4d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#6b4f35" }}>
        {room.name}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4a2d1a", marginBottom: 4 }}>{room.host}</div>
        <div style={{ fontSize: 12, color: "#8a6a4a", marginBottom: 8 }}>{room.tag}</div>
        <div style={{ fontSize: 12, color: "#6b4f35" }}>
          {fmtNum(stats.viewers)} watching · {fmtNum(stats.comments)} comments
        </div>
      </div>
    </div>
  );
}

export function RoomBrowser({ rooms, stats, onJoin }: RoomBrowserProps) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#4a2d1a", marginBottom: 12 }}>
        Choose a room to join
      </div>
      {rooms.length === 0 ? (
        <div style={{ color: "#8a6a4a", fontSize: 13 }}>No rooms yet. Create one from the admin view.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {rooms.map((room) => (
            <BrowserCard key={room.id} room={room} stats={stats[room.id]} onJoin={() => onJoin(room)} />
          ))}
        </div>
      )}
    </div>
  );
}
