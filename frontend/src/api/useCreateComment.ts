import { useState } from "react";
import api from "./api";
import axios from "axios";

const useCreateComment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = async (comment: string, roomID: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/comment/create?room_id=${roomID}`, {
        comment,
        user_id: "guest",
      });
      return res.data.comment;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error ?? "Comment creation failed";
        setError(errorMsg);
        alert(errorMsg);
      } else {
        const errorMsg = "Comment creation failed";
        setError(errorMsg);
        alert(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return { createComment, error, loading };
};

export default useCreateComment;
