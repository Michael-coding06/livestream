import api from "./api";
import type { Room, RoomPayload } from "../types";

function mapRoom(raw: any): Room {
  const id = Number(raw.room_id ?? raw.id ?? 0);
  return {
    id,
    name: String(raw.name ?? `Room #${id || "new"}`),
    host: raw.host ? String(raw.host) : "",
    description: raw.description ? String(raw.description) : "",
    status: "offline",
    viewers: 0,
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    emoji: "",
    bgClass: "",
    bgColor: "",
    tag: "",
    accentColor: "",
  };
}

export async function fetchRooms(): Promise<Room[]> {
  const res = await api.get("/rooms");
  const rows = Array.isArray(res.data?.rooms) ? res.data.rooms : [];
  return rows.map(mapRoom);
}

export async function createRoom(payload: RoomPayload): Promise<Room> {
  const res = await api.post("/room/create", {
    name: payload.name,
    host: payload.host,
  });
  return mapRoom(res.data?.room ?? {});
}
