export type LeaderboardEntry = {
  Member: string;
  Score: number;
};

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardPanel({ entries }: LeaderboardPanelProps) {
  const visibleEntries = entries.slice(0, 10);

  return (
    <aside style={{
      position: "absolute",
      top: 68,
      right: 10,
      width: 190,
      maxWidth: "42%",
      padding: "10px 12px",
      background: "rgba(255,253,249,0.94)",
      border: "1px solid #e2d2bf",
      borderRadius: 10,
      color: "#4a2d1a",
      boxShadow: "0 8px 24px rgba(74,45,26,0.12)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <strong style={{ fontSize: 12 }}>Top supporters</strong>
        <span style={{ fontSize: 10, color: "#8b5a2b" }}>{visibleEntries.length}/10</span>
      </div>
      {visibleEntries.length === 0 ? (
        <span style={{ fontSize: 11, color: "#8b735f" }}>No donations yet</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {visibleEntries.map((entry, index) => (
            <div key={`${entry.Member}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ width: 16, color: index < 3 ? "#b45309" : "#8b735f", fontWeight: 700 }}>{index + 1}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.Member}</span>
              <span style={{ color: "#8b5a2b", fontWeight: 700 }}>{entry.Score}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}