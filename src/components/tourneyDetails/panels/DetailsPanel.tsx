// src/components/tourneyDetails/panels/DetailsPanel.tsx
import React, { useMemo } from "react";
import type { TourneyCardTourney } from "../../TourneyCard";
import { InfoRow, Section } from "../ui";

const DetailsPanel: React.FC<{ tourney: TourneyCardTourney }> = ({ tourney }) => {
  const start = tourney.start_time ? new Date(tourney.start_time) : null;

  const startPretty = useMemo(() => {
    if (!start) return "TBD";
    return `${start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })} • ${start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }, [tourney.start_time]);

  const prizePool =
    tourney.prize_pool === undefined || tourney.prize_pool === null || tourney.prize_pool === ""
      ? "TBD"
      : typeof tourney.prize_pool === "number"
      ? `$${tourney.prize_pool.toLocaleString()}`
      : String(tourney.prize_pool);

  return (
    <>
      <Section title="Key Info">
        <InfoRow label="Start" value={startPretty} />
        <InfoRow label="Prize Pool" value={prizePool} />
        <InfoRow
          label="Google Sheet"
          value={
            tourney.google_sheet_link ? (
              <a
                href={tourney.google_sheet_link}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#a777e4", fontWeight: 800 }}
              >
                Open Sheet
              </a>
            ) : (
              "—"
            )
          }
        />
      </Section>

      <Section title="Tournament Info">
        {tourney.info ? (
          <pre
            style={{
              margin: 0,
              padding: 16,
              borderRadius: 10,
              background: "#14182d",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              lineHeight: 1.4,
              overflowX: "auto",
            }}
          >
            {JSON.stringify(tourney.info, null, 2)}
          </pre>
        ) : (
          <div style={{ opacity: 0.8 }}>No extra info provided.</div>
        )}
      </Section>
    </>
  );
};

export default DetailsPanel;
