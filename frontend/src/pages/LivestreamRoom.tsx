import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStudioSession } from "../hooks/useStudioSession";
import type { Room } from "../types";
import StudioPage from "./Studio";

type LivestreamRoomPageProps = {
  rooms: Room[];
  onUpdateRoom: (roomId: number, patch: Partial<Room>) => void;
};

export default function LivestreamRoomPage({ rooms, onUpdateRoom }: LivestreamRoomPageProps) {
  const navigate = useNavigate();
  const { roomId: pathRoomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const roomIdParam = pathRoomId ?? searchParams.get("roomId");
  const roomId = roomIdParam ? Number(roomIdParam) : NaN;
  const room = Number.isInteger(roomId)
    ? rooms.find((entry) => entry.id === roomId) ?? null
    : null;
  const studio = useStudioSession(room, onUpdateRoom);

  if (!room) {
    return (
      <main className="page unavailable-page">
        <section className="unavailable-card" role="alert">
          <span className="unavailable-icon" aria-hidden="true">!</span>
          <h1>Room unavailable</h1>
          <p>This livestream is no longer available or the room link is invalid.</p>
          <button className="brand-btn" onClick={() => navigate("/dashboard")}>OK</button>
        </section>
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
      leaderboard={studio.leaderboard}
      donationNotice={studio.donationNotice}
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
