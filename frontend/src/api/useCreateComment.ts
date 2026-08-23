import { useState } from "react";
import api from "./api";
import axios from "axios";

const useCreateComment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = async (comment: string, roomID: number, username: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/comment/create`, {
        roomID,
        comment,
        username,
        user_id: -1,
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
