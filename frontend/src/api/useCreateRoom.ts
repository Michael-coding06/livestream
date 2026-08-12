import { useState } from "react";
import api from "./api";
import axios from "axios";
import type { Room } from "../types";

const useCreateRoom = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async (name: string, host: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/room/create", {
        name,
        host,
      });

      const room = res.data.room;
      return {
        id: Number(room.room_id ?? room.id ?? 0),
        name: room.name,
        host: room.host,
        emoji: "",
        bgClass: "",
        bgColor: "",
        tag: "",
        accentColor: "",
      } as Room;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error ?? "Room creation failed";
        setError(errorMsg);
        alert(errorMsg);
      } else {
        const errorMsg = "Room creation failed";
        setError(errorMsg);
        alert(errorMsg);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createRoom, error, loading };
};

export default useCreateRoom;
