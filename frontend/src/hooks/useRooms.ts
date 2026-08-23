import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoom as createRoomApi, fetchRooms } from "../api/rooms";
import type { Room } from "../types";

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRooms();
        setRooms(data);
      } catch (err) {
        console.error("Failed to load rooms", err);
        setError("Failed to load rooms");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const createRoom = useCallback(async (name: string, host: string, description: string) => {
    const created = await createRoomApi({ name, host, description });
    const withDescription = { ...created, description };
    setRooms((prev) => [withDescription, ...prev]);
    return withDescription;
  }, []);

  const updateRoom = useCallback((roomId: number, patch: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;

        const changed = Object.entries(patch).some(
          ([key, value]) => room[key as keyof Room] !== value,
        );

        return changed ? { ...room, ...patch } : room;
      }),
    );
  }, []);

  const roomMap = useMemo(() => {
    const map = new Map<number, Room>();
    rooms.forEach((room) => map.set(room.id, room));
    return map;
  }, [rooms]);

  return { rooms, loading, error, createRoom, updateRoom, roomMap };
}
