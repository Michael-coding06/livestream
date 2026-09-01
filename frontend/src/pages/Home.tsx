import type { FormEvent } from "react";
import type { Room } from "../types";
import { formatAge, formatNumber } from "../utils/format";

type HomePageProps = {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  showCreate: boolean;
  roomName: string;
  hostName: string;
  description: string;
  creating: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onRoomNameChange: (v: string) => void;
  onHostNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSubmitRoomCreate: (e: FormEvent) => void;
  onOpenStudio: (room: Room) => void;
};

export default function HomePage(props: HomePageProps) {
  return (
    <main className="page page-home">
      <section className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Manage your livestream rooms</p>
        </div>
        <button className="brand-btn" onClick={props.onOpenCreate}>
          + Create Room
        </button>
      </section>

      {props.loading ? <p className="empty">Loading rooms...</p> : null}
      {props.error ? <p className="error">{props.error}</p> : null}

      {!props.loading && props.rooms.length === 0 ? (
        <div className="empty-card">
          <p>No rooms yet. Create your first room.</p>
          <button className="link-btn" onClick={props.onOpenCreate}>Create room</button>
        </div>
      ) : null}

      {props.rooms.length > 0 ? (
        <section className="room-list">
          <div className="list-title">
            <span>My Rooms</span>
            <span className="count-chip">{props.rooms.length}</span>
          </div>

          {props.rooms.map((room) => (
            <button key={room.id} className="room-row" onClick={() => props.onOpenStudio(room)}>
              <span className={room.status === "live" ? "status-dot live" : "status-dot"} />
              <div className="room-main">
                <strong>{room.name}</strong>
                <small>{room.description || room.host || "No description"}</small>
              </div>
              <div className="room-meta">
                <small>{formatNumber(room.viewers || 0)} viewers</small>
                <small>{formatAge(room.createdAt)}</small>
              </div>
            </button>
          ))}
        </section>
      ) : null}

      {props.showCreate ? (
        <div className="modal-backdrop" onClick={props.onCloseCreate}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Room</h2>
            <form onSubmit={props.onSubmitRoomCreate} className="form-col">
              <input
                value={props.roomName}
                onChange={(e) => props.onRoomNameChange(e.target.value)}
                placeholder="Room name"
              />
              <input
                value={props.hostName}
                onChange={(e) => props.onHostNameChange(e.target.value)}
                placeholder="Host name"
              />
              <textarea
                value={props.description}
                onChange={(e) => props.onDescriptionChange(e.target.value)}
                rows={3}
                placeholder="Description"
              />
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={props.onCloseCreate}>Cancel</button>
                <button type="submit" className="brand-btn" disabled={props.creating}>
                  {props.creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
