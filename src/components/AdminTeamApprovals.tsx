// src/components/AdminTeamApprovals.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type RegistrationRow = {
  id: string;
  tourney_id: string;
  team_id: string;
  created_at: string;
  confirmed: boolean;

  tourney: {
    UUID: string;
    "Tourney Name": string;
    "Start Time": string | null;
  } | null;

  team: {
    UUID: string;
    "Team Name": string | null;
    "Team Logo": string | null;
    "Player 1": string | null;
    "Player 2": string | null;
    "Player 3": string | null;
  } | null;
};

type ProfileRow = { id: string; gamertag: string | null };

function uniqNonNull(arr: Array<string | null | undefined>) {
  return Array.from(new Set(arr.filter(Boolean) as string[]));
}
function shortId(id: string) {
  return id.slice(0, 8);
}

const AdminTeamApprovals: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pendingRegs, setPendingRegs] = useState<RegistrationRow[]>([]);
  const [gamertagById, setGamertagById] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const fetchPending = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("tourney_registrations")
        .select(
          `
          id,
          tourney_id,
          team_id,
          created_at,
          confirmed,
          tourney:tournaments (
            "UUID",
            "Tourney Name",
            "Start Time"
          ),
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
        .eq("confirmed", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const regs = ((data as any) ?? []) as RegistrationRow[];
      setPendingRegs(regs);

      const playerIds = uniqNonNull(
        regs.flatMap((r) => [
          r.team?.["Player 1"] ?? null,
          r.team?.["Player 2"] ?? null,
          r.team?.["Player 3"] ?? null,
        ])
      );

      if (playerIds.length === 0) {
        setGamertagById({});
        return;
      }

      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, gamertag")
        .in("id", playerIds);

      if (profErr) throw profErr;

      const map: Record<string, string> = {};
      ((profs as any) ?? []).forEach((p: ProfileRow) => {
        if (p?.id) map[p.id] = (p.gamertag ?? "").trim();
      });

      setGamertagById(map);
    } catch (e: any) {
      console.error("fetchPending teams error:", e);
      setPendingRegs([]);
      setGamertagById({});
      setErrorMsg(e?.message ?? "Failed to load pending teams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const approve = async (regId: string) => {
    setBusyId(regId);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("tourney_registrations")
        .update({ confirmed: true })
        .eq("id", regId);

      if (error) throw error;

      // remove from local list
      setPendingRegs((prev) => prev.filter((r) => r.id !== regId));
    } catch (e: any) {
      console.error("approve error:", e);
      setErrorMsg(e?.message ?? "Failed to approve team.");
    } finally {
      setBusyId(null);
    }
  };

  const deny = async (regId: string) => {
    setBusyId(regId);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("tourney_registrations")
        .delete()
        .eq("id", regId);

      if (error) throw error;

      setPendingRegs((prev) => prev.filter((r) => r.id !== regId));
    } catch (e: any) {
      console.error("deny error:", e);
      setErrorMsg(e?.message ?? "Failed to remove registration.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingRegs;

    return pendingRegs.filter((r) => {
      const tname = (r.team?.["Team Name"] ?? "").toLowerCase();
      const tourneyName = (r.tourney?.["Tourney Name"] ?? "").toLowerCase();

      const p1 = r.team?.["Player 1"] ? (gamertagById[r.team["Player 1"]] || "") : "";
      const p2 = r.team?.["Player 2"] ? (gamertagById[r.team["Player 2"]] || "") : "";
      const p3 = r.team?.["Player 3"] ? (gamertagById[r.team["Player 3"]] || "") : "";
      const players = `${p1} ${p2} ${p3}`.toLowerCase();

      return tname.includes(q) || tourneyName.includes(q) || players.includes(q);
    });
  }, [pendingRegs, search, gamertagById]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Team Approvals</h1>

        <button
          onClick={fetchPending}
          style={btn("#14182d")}
          type="button"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div style={{ height: 12 }} />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search team / tournament / player…"
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#14182d",
          color: "white",
          fontWeight: 800,
          outline: "none",
        }}
      />

      <div style={{ height: 14 }} />

      {errorMsg && (
        <div style={{ color: "#ffb4b4", fontWeight: 900, marginBottom: 10 }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ opacity: 0.85 }}>Loading pending teams…</div>
      ) : filtered.length === 0 ? (
        <div style={{ opacity: 0.85 }}>No pending teams.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((r) => {
            const teamName = r.team?.["Team Name"] || "Unnamed Team";
            const tourneyName = r.tourney?.["Tourney Name"] || "Unknown Tourney";

            const p1Id = r.team?.["Player 1"] ?? null;
            const p2Id = r.team?.["Player 2"] ?? null;
            const p3Id = r.team?.["Player 3"] ?? null;

            const p1 = p1Id ? (gamertagById[p1Id] || shortId(p1Id)) : "—";
            const p2 = p2Id ? (gamertagById[p2Id] || shortId(p2Id)) : "—";
            const p3 = p3Id ? (gamertagById[p3Id] || shortId(p3Id)) : "—";

            return (
              <div
                key={r.id}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#14182d",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 260 }}>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>{teamName}</div>
                    <div style={{ opacity: 0.85, marginTop: 2 }}>
                      <span style={{ fontWeight: 900 }}>Tournament:</span> {tourneyName}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 6, fontWeight: 850 }}>
                      {p1} • {p2} • {p3}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      style={btn("#a777e4", true)}
                      onClick={() => approve(r.id)}
                      disabled={busyId === r.id}
                    >
                      {busyId === r.id ? "Approving…" : "Approve"}
                    </button>

                    <button
                      type="button"
                      style={btn("#2a2f55")}
                      onClick={() => deny(r.id)}
                      disabled={busyId === r.id}
                    >
                      {busyId === r.id ? "Removing…" : "Deny"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTeamApprovals;

function btn(bg: string, darkText = false): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: bg,
    color: darkText ? "#000" : "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}
