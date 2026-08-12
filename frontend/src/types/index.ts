export type Mode = "admin" | "user";

export interface Room {
  id: number;
  name: string;
  host: string;
  emoji: string;
  bgClass: string;
  bgColor: string;
  tag: string;
  accentColor: string;
}

export interface RoomStats {
  viewers: number;
  comments: number;
  gifts: number;
  revenue: number;
  likes: number;
}

export interface GiftType {
  name: string;
  emoji: string;
  cost: number;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  color: string;
  timestamp: number;
}

export interface GiftToast {
  id: string;
  emoji: string;
  name: string;
  sender: string;
  count: number;
  timestamp: number;
}
