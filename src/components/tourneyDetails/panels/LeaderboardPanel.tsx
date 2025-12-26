// src/components/tourneyDetails/panels/LeaderboardPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import type { LeaderboardRow, ProfileRow } from "../types";
import { coerceSingle, fmtPoints, shortId, uniqNonNull } from "../utils";
import { btn } from "../ui";

const LeaderboardPanel: React.FC<{ tourneyId: string }> = ({ tourneyId }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [gamertagById, setGamertagById] = useState<Record<string, string>>({});

  const fetchLeaderboard = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("leaderboard_team_totals")
        .select(
          `
          tourney_id,
          team_id,
          maps_played,
          total_kills,
          total_points,
          updated_at,
          team:"Established Teams" (
            "UUID",
            "Team Name",
            "Team Logo",
            "Player 1",
            "Player 2",
            "Player 3"
          )
        `
        )
        .eq("tourney_id", tourneyId)
        .order("total_points", { ascending: false })
        .order("total_kills", { ascending: false });

      if (error) throw error;

      const lbRows = ((data as any) ?? []) as LeaderboardRow[];
      setRows(lbRows);

      const allPlayerIds = uniqNonNull(
        lbRows.flatMap((r) => {
          const team = coerceSingle(r.team);
          return [team?.["Player 1"] ?? null, team?.["Player 2"] ?? null, team?.["Player 3"] ?? null];
        })
      );

      if (allPlayerIds.length === 0) {
        setGamertagById({});
        return;
      }

      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("id, gamertag")
        .in("id", allPlayerIds);

      if (profErr) throw profErr;

      const map: Record<string, string> = {};
      ((profData as any) ?? []).forEach((p: ProfileRow) => {
        if (p?.id) map[p.id] = (p.gamertag ?? "").trim();
      });
      setGamertagById(map);
    } catch (e: any) {
      console.error("fetchLeaderboard error:", e);
      setRows([]);
      setGamertagById({});
      setErrorMsg(e?.message ?? "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourneyId]);

  const table = useMemo(() => {
    if (rows.length === 0) return null;

    return (
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          overflow: "hidden",
          background: "#14182d",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 1.6fr 0.8fr 0.8fr 0.7fr",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            fontWeight: 950,
            background: "#10142a",
          }}
        >
          <div style={{ opacity: 0.9 }}>Rank</div>
          <div style={{ opacity: 0.9 }}>Team</div>
          <div style={{ opacity: 0.9 }}>Points</div>
          <div style={{ opacity: 0.9 }}>Kills</div>
          <div style={{ opacity: 0.9 }}>Maps</div>
        </div>

        {rows.map((row, idx) => {
          const team = coerceSingle(row.team);
          const teamName = team?.["Team Name"] || "Unnamed Team";
          const logo = team?.["Team Logo"] || null;

          const p1 = team?.["Player 1"]
            ? gamertagById[team["Player 1"]] || shortId(team["Player 1"])
            : "—";
          const p2 = team?.["Player 2"]
            ? gamertagById[team["Player 2"]] || shortId(team["Player 2"])
            : "—";
          const p3 = team?.["Player 3"]
            ? gamertagById[team["Player 3"]] || shortId(team["Player 3"])
            : "—";

          return (
            <div
              key={`${row.team_id}-${idx}`}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1.6fr 0.8fr 0.8fr 0.7fr",
                gap: 10,
                padding: "12px 14px",
                borderBottom:
                  idx === rows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 950 }}>#{idx + 1}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
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
                    <div style={{ fontWeight: 950, opacity: 0.8 }}>{teamName.slice(0, 2).toUpperCase()}</div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {teamName}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p1} • {p2} • {p3}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 950 }}>{fmtPoints(row.total_points)}</div>
              <div style={{ fontWeight: 950 }}>{row.total_kills ?? 0}</div>
              <div style={{ fontWeight: 950 }}>{row.maps_played ?? 0}</div>
            </div>
          );
        })}
      </div>
    );
  }, [rows, gamertagById]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Leaderboard</h2>
        <button type="button" onClick={fetchLeaderboard} style={btn("#14182d")}>
          Refresh
        </button>
      </div>

      <div style={{ height: 12 }} />

      {loading ? (
        <div style={{ opacity: 0.85 }}>Loading leaderboard…</div>
      ) : errorMsg ? (
        <div style={{ color: "#ffb4b4", fontWeight: 800 }}>{errorMsg}</div>
      ) : rows.length === 0 ? (
        <div style={{ opacity: 0.85 }}>No confirmed teams on the leaderboard yet.</div>
      ) : (
        table
      )}
    </div>
  );
};

export default LeaderboardPanel;
