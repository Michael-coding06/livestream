import { useState } from "react";
import api from "./api";
import axios from "axios";

const useSendFlower = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendFlower = async (roomID: number, count: number, userName: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/flower/send", {
        roomID,
        count,
        user_name: userName,
        gift_value: count,
      });
      return res.data.flower;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error ?? "Flower send failed";
        setError(errorMsg);
        alert(errorMsg);
        throw error;
      } else {
        const errorMsg = "Flower send failed";
        setError(errorMsg);
        alert(errorMsg);
        throw error;
      } 
    } finally {
      setLoading(false);
    }
  };

  return { sendFlower, error, loading };
};

export default useSendFlower;
