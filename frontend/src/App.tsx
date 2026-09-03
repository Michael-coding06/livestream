import { useState, type FormEvent } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Header } from "./components/Header";
import { useRooms } from "./hooks/useRooms";
import HomePage from "./pages/Home";
import LivestreamRoomPage from "./pages/LivestreamRoom";
import type { Room } from "./types";

export default function App() {
  const { rooms, loading, error, createRoom, updateRoom } = useRooms();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [hostName, setHostName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const closeCreate = () => {
    setShowCreate(false);
    setRoomName("");
    setHostName("");
    setDescription("");
  };

  const onOpenRoom = (room: Room) => {
    navigate(`/livestream-room?roomId=${room.id}`);
  };

  const submitRoomCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = roomName.trim();
    const host = hostName.trim();
    const desc = description.trim();
    if (!name || !host || creating) return;

    setCreating(true);
    try {
      const room = await createRoom(name, host, desc);
      closeCreate();
      onOpenRoom(room);
    } catch (err) {
      console.error("Room creation failed", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <HomePage
              rooms={rooms}
              loading={loading}
              error={error}
              showCreate={showCreate}
              roomName={roomName}
              hostName={hostName}
              description={description}
              creating={creating}
              onOpenCreate={() => setShowCreate(true)}
              onCloseCreate={closeCreate}
              onRoomNameChange={setRoomName}
              onHostNameChange={setHostName}
              onDescriptionChange={setDescription}
              onSubmitRoomCreate={submitRoomCreate}
              onOpenStudio={onOpenRoom}
            />
          }
        />
        <Route
          path="/livestream-room"
          element={<LivestreamRoomPage rooms={rooms} onUpdateRoom={updateRoom} />}
        />
      </Routes>
    </div>
  );
}
