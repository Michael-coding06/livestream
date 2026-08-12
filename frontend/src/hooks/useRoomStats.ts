import { useState, useEffect, useCallback, useRef } from "react";
import type { Room, RoomStats } from "../types";
import { createDefaultRoomStats, initRoomStats } from "../data";

export function useRoomStats(rooms: Room[]) {
  const [stats, setStats] = useState<Record<number, RoomStats>>(() => initRoomStats(rooms));
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    setStats((prev) => {
      const next = { ...prev };
      rooms.forEach((room) => {
        if (!next[room.id]) {
          next[room.id] = createDefaultRoomStats();
        }
      });
      return next;
    });
  }, [rooms]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => {
        const next = { ...prev };
        rooms.forEach((room) => {
          const s = { ...(prev[room.id] ?? createDefaultRoomStats()) };
          s.viewers = Math.max(100, s.viewers + Math.floor(Math.random() * 40) - 15);
          s.comments += Math.floor(Math.random() * 8) + 1;
          const newGifts = Math.floor(Math.random() * 3);
          s.gifts += newGifts;
          s.revenue += newGifts * (Math.floor(Math.random() * 80) + 10);
          s.likes += Math.floor(Math.random() * 20);
          next[room.id] = s;
        });
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [rooms]);

  const bumpGift = useCallback((roomId: number, cost: number, count: number) => {
    setStats((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        gifts: prev[roomId].gifts + count,
        revenue: prev[roomId].revenue + cost * count,
      },
    }));
  }, []);

  const bumpLike = useCallback((roomId: number) => {
    setStats((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], likes: prev[roomId].likes + 1 },
    }));
  }, []);

  const bumpComment = useCallback((roomId: number) => {
    setStats((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], comments: prev[roomId].comments + 1 },
    }));
  }, []);

  return { stats, bumpGift, bumpLike, bumpComment };
}
