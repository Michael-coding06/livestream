import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_SERVICE_URL || "http://localhost:8087",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
