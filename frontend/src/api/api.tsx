import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8087",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
