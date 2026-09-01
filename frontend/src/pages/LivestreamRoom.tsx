import { useNavigate, useParams } from "react-router-dom";
import { useStudioSession } from "../hooks/useStudioSession";
import type { Room } from "../types";
import StudioPage from "./Studio";

type LivestreamRoomPageProps = {
  rooms: Room[];
  onUpdateRoom: (roomId: number, patch: Partial<Room>) => void;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LivestreamRoomPage({ rooms, onUpdateRoom }: LivestreamRoomPageProps) {
  const navigate = useNavigate();
  const { roomSlug } = useParams();
  const room = rooms.find((entry) => slugify(entry.name) === roomSlug) ?? null;
  const studio = useStudioSession(room, onUpdateRoom);

  if (!room) {
    return (
      <main className="page">
        <p className="empty">Room not found.</p>
      </main>
    );
  }

  return (
    <StudioPage
      room={room}
      isLive={studio.isLive}
      duration={studio.duration}
      viewerCount={studio.viewerCount}
      copied={studio.copied}
      busy={studio.busy}
      chatInput={studio.chatInput}
      username={studio.username}
      chatMessages={studio.chatMessages}
      onGoHome={() => navigate("/dashboard")}
      onGoLive={studio.goLive}
      onEndLive={studio.endLive}
      onCopyLink={studio.copyLink}
      onChatInputChange={studio.setChatInput}
      onUsernameChange={studio.setUsername}
      onSendChat={studio.submitChat}
      onSendGift={studio.sendGift}
    />
  );
}
