import type { Room, GiftType } from "../types";

export const ROOMS: Room[] = [
  { id: 1, name: "MusicVibes", host: "DJ_Nova", emoji: "🎵", bgClass: "bg-room-1", bgColor: "#1a1a2e", tag: "Music", accentColor: "#7f77dd" },
  { id: 2, name: "GamingArena", host: "ProGamer_X", emoji: "🎮", bgClass: "bg-room-2", bgColor: "#0d1b2a", tag: "Gaming", accentColor: "#378add" },
];

export const GIFTS: GiftType[] = [
  { name: "Rose", emoji: "🌹", cost: 10 },
];

export function createDefaultRoomStats(): import("../types").RoomStats {
  return {
    viewers: Math.floor(Math.random() * 3000) + 500,
    comments: Math.floor(Math.random() * 500) + 100,
    gifts: Math.floor(Math.random() * 200) + 50,
    revenue: Math.floor(Math.random() * 2000) + 400,
    likes: Math.floor(Math.random() * 8000) + 1000,
  };
}

export function initRoomStats(rooms: Room[] = ROOMS): Record<number, import("../types").RoomStats> {
  const stats: Record<number, import("../types").RoomStats> = {};
  rooms.forEach((r) => {
    stats[r.id] = createDefaultRoomStats();
  });
  return stats;
}

export function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}
