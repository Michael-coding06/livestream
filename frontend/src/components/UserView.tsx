import { useState, useCallback } from "react";
import type { Room, RoomStats } from "../types";
import { RoomBrowser } from "./RoomBrowser";
import { LiveRoom } from "./LiveRoom";

interface UserViewProps {
  rooms: Room[];
  stats: Record<number, RoomStats>;
  initialRoom: Room | null;
  onSendGift: (roomId: number, cost: number, count: number) => void;
  onLike: (roomId: number) => void;
  onComment: (roomId: number) => void;
}

export function UserView({ rooms, stats, initialRoom, onSendGift, onLike, onComment }: UserViewProps) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(initialRoom);

  // Add your WebSocket/Redis room join logic here when a user enters a room.
  const handleJoin = useCallback((room: Room) => setActiveRoom(room), []);
  // Add your WebSocket/Redis room leave logic here when the user exits the room.
  const handleBack = useCallback(() => setActiveRoom(null), []);

  if (activeRoom) {
    return (
      <LiveRoom
        room={activeRoom}
        stats={stats[activeRoom.id]}
        onBack={handleBack}
        onSendGift={(cost, count) => onSendGift(activeRoom.id, cost, count)}
        onLike={() => onLike(activeRoom.id)}
        onComment={() => onComment(activeRoom.id)}
      />
    );
  }

  return <RoomBrowser rooms={rooms} stats={stats} onJoin={handleJoin} />;
}
