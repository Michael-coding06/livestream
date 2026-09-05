import type { FormEvent } from "react";
import type { ChatMessage, Room } from "../types";
import { formatDuration, formatNumber } from "../utils/format";
import { LeaderboardPanel } from "../components/LeaderboardPanel";
import type { DonationNotice } from "../hooks/useLiveRoom";

type StudioPageProps = {
  room: Room;
  isLive: boolean;
  duration: number;
  viewerCount: number;
  copied: boolean;
  busy: boolean;
  chatInput: string;
  username: string;
  chatMessages: ChatMessage[];
  leaderboard: Array<{ Member: string; Score: number }>;
  donationNotice: DonationNotice | null;
  onGoHome: () => void;
  onGoLive: () => void;
  onEndLive: () => void;
  onCopyLink: () => void;
  onChatInputChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  onSendChat: (e: FormEvent) => void;
  onSendGift: (count: number) => void;
};

export default function StudioPage(props: StudioPageProps) {
  return (
    <main className="page page-studio">
      <section className="studio-head">
        <button className="ghost-btn" onClick={props.onGoHome}>Back</button>
        <div className="studio-room">
          <h1>{props.room.name}</h1>
          <p>{props.room.description || props.room.host || "Live session"}</p>
        </div>
        <div className="studio-actions">
          <button className="ghost-btn" onClick={props.onCopyLink}>
            {props.copied ? "Copied" : "Copy link"}
          </button>
          {props.isLive ? (
            <button className="danger-btn" onClick={props.onEndLive}>End stream</button>
          ) : (
            <button className="brand-btn" onClick={props.onGoLive}>Go live</button>
          )}
        </div>
      </section>

      <section className="studio-grid">
        <article className="video-stage">
          <div className="video-overlay">
            <span className={props.isLive ? "pill live" : "pill"}>{props.isLive ? "LIVE" : "OFFLINE"}</span>
            <span className="pill">{formatNumber(props.viewerCount)} watching</span>
            <span className="pill">{formatDuration(props.duration)}</span>
          </div>
          <div className="video-placeholder">Camera Preview</div>
          <LeaderboardPanel entries={props.leaderboard} />
          {props.donationNotice ? (
            <div className="donation-notice">
              {props.donationNotice.userName} donated {props.donationNotice.value} flower{props.donationNotice.value === 1 ? "" : "s"}
            </div>
          ) : null}
          <div className="gift-row">
            <button onClick={() => props.onSendGift(1)} disabled={props.busy}>Send 1 flower</button>
            <button onClick={() => props.onSendGift(5)} disabled={props.busy}>Send 5 flowers</button>
            <button onClick={() => props.onSendGift(10)} disabled={props.busy}>Send 10 flowers</button>
          </div>
        </article>

        <aside className="chat-panel">
          <h2>Live Chat</h2>
          <div className="chat-list">
            {props.chatMessages.map((msg) => (
              <div key={msg.id} className="chat-item">
                <strong style={{ color: msg.color }}>{msg.user}</strong>
                <p>{msg.text}</p>
              </div>
            ))}
            {props.chatMessages.length === 0 ? <p className="empty">No messages yet.</p> : null}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSendChat(e);
            }}
          >
            <input
              value={props.username}
              onChange={(e) => props.onUsernameChange(e.target.value)}
              placeholder="Username"
              maxLength={30}
            />
            <input
              value={props.chatInput}
              onChange={(e) => props.onChatInputChange(e.target.value)}
              placeholder="Write a message"
              maxLength={120}
            />
            <button type="submit" className="brand-btn" disabled={props.busy}>Send</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
