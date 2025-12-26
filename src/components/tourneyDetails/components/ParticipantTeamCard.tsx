// src/components/tourneyDetails/components/ParticipantTeamCard.tsx
import React from "react";
import type { RegistrationRow } from "../types";
import { coerceSingle, shortId } from "../utils";

const PlayerRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10 }}>
    <div style={{ opacity: 0.75, fontWeight: 800 }}>{label}</div>
    <div style={{ fontWeight: 900 }}>{value}</div>
  </div>
);

const ParticipantTeamCard: React.FC<{
  reg: RegistrationRow;
  gamertagById: Record<string, string>;
}> = ({ reg, gamertagById }) => {
  const team = coerceSingle(reg.team);

  const teamName = team?.["Team Name"] || "Unnamed Team";
  const logo = team?.["Team Logo"] || null;

  const p1Id = team?.["Player 1"] ?? null;
  const p2Id = team?.["Player 2"] ?? null;
  const p3Id = team?.["Player 3"] ?? null;

  const p1Tag = p1Id ? gamertagById[p1Id] || shortId(p1Id) : "—";
  const p2Tag = p2Id ? gamertagById[p2Id] || shortId(p2Id) : "—";
  const p3Tag = p3Id ? gamertagById[p3Id] || shortId(p3Id) : "—";

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#14182d",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: "#0f1325",
            border: "1px solid rgba(255,255,255,0.12)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {logo ? (
            <img src={logo} alt={teamName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontWeight: 900, opacity: 0.8 }}>{teamName.slice(0, 2).toUpperCase()}</div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.1 }}>{teamName}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
            {reg.confirmed ? "Confirmed" : "Pending"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <PlayerRow label="Player 1" value={p1Tag} />
        <PlayerRow label="Player 2" value={p2Tag} />
        <PlayerRow label="Player 3" value={p3Tag} />
      </div>
    </div>
  );
};

export default ParticipantTeamCard;
