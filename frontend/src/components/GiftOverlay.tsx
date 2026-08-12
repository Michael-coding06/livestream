
import type { GiftToast } from "../types";

interface GiftOverlayProps {
  toasts: GiftToast[];
}

function GiftToastItem({ toast }: { toast: GiftToast }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.9)", border: "1px solid #e2d2bf", borderRadius: 999, padding: "6px 10px", animation: "giftIn 0.4s cubic-bezier(.34,1.56,.64,1)" }}>
      <span style={{ fontSize: 18 }}>{toast.emoji}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11, color: "#8b5a2b", fontWeight: 600 }}>{toast.sender}</span>
        <span style={{ fontSize: 10, color: "#6b4f35" }}>{toast.name}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#8b5a2b", marginLeft: "auto" }}>×{toast.count}</span>
    </div>
  );
}

export function GiftOverlay({ toasts }: GiftOverlayProps) {
  return (
    <>
      <style>{`
        @keyframes giftIn {
          from { opacity: 0; transform: scale(0.75) translateX(20px); }
          to   { opacity: 1; transform: scale(1) translateX(0); }
        }
      `}</style>
      <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, pointerEvents: "none", width: "42%" }}>
        {toasts.map((t) => (
          <GiftToastItem key={t.id} toast={t} />
        ))}
      </div>
    </>
  );
}
