import { useMemo, useState, type FormEvent } from "react";
import { Header } from "./components/Header";
import { useRooms } from "./hooks/useRooms";
import { useStudioSession } from "./hooks/useStudioSession";
import HomePage from "./pages/Home";
import StudioPage from "./pages/Studio";
import type { Room } from "./types";

type Page =
  | { name: "home" }
  | { name: "studio"; roomId: number };

export default function App() {
  const { rooms, loading, error, createRoom, updateRoom, roomMap } = useRooms();
  const [page, setPage] = useState<Page>({ name: "home" });

  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [hostName, setHostName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const activeRoom: Room | null = useMemo(() => {
    if (page.name !== "studio") return null;
    return roomMap.get(page.roomId) ?? null;
  }, [page, roomMap]);

  const studio = useStudioSession(activeRoom, updateRoom);

  const openStudio = (room: Room) => setPage({ name: "studio", roomId: room.id });

  const goHome = () => setPage({ name: "home" });

  const closeCreate = () => {
    setShowCreate(false);
    setRoomName("");
    setHostName("");
    setDescription("");
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = roomName.trim();
    const host = hostName.trim();
    const desc = description.trim();
    if (!name || !host || creating) return;

    setCreating(true);
    try {
      const room = await createRoom(name, host, desc);
      closeCreate();
      openStudio(room);
    } catch (err) {
      console.error("Room creation failed", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      <Header onGoHome={goHome} inStudio={page.name === "studio"} />

      {page.name === "home" ? (
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
          onSubmitCreate={submitCreate}
          onOpenStudio={openStudio}
        />
      ) : null}

      {page.name === "studio" && activeRoom ? (
        <StudioPage
          room={activeRoom}
          isLive={studio.isLive}
          duration={studio.duration}
          viewerCount={studio.viewerCount}
          copied={studio.copied}
          busy={studio.busy}
          chatInput={studio.chatInput}
          username={studio.username}
          chatMessages={studio.chatMessages}
          onGoHome={goHome}
          onGoLive={studio.goLive}
          onEndLive={studio.endLive}
          onCopyLink={studio.copyLink}
          onChatInputChange={studio.setChatInput}
          onUsernameChange={studio.setUsername}
          onSendChat={studio.submitChat}
          onSendGift={studio.sendGift}
        />
      ) : null}
    </div>
  );
}
