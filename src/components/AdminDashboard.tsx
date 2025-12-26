// src/components/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { RefreshCcw } from "lucide-react";
import "../styles/AdminDashboard.css";
import ScoreboardPreview from "./ScoreboardPreview";

type EstablishedTeamRow = {
  UUID: string;
  "Team Name": string | null;
  "Player 1": string | null;
  "Player 2": string | null;
  "Player 3": string | null;
};

type TeamJoinShape = EstablishedTeamRow[] | EstablishedTeamRow | null;

type SubmissionRow = {
  id: string;
  tourney_id: string;
  team_id: string;
  map_number: number;
  player1_kills: number;
  player2_kills: number;
  player3_kills: number;
  placement: number | null;
  scoreboard_image_url: string | null; // STORAGE PATH (recommended)
  status: string;
  created_at?: string;
  team: TeamJoinShape;
};

type Submission = {
  id: string;
  tourney_id: string;
  team_id: string;
  map_number: number;
  player1_kills: number;
  player2_kills: number;
  player3_kills: number;
  placement: number | null;
  scoreboard_image_url: string | null; // STORAGE PATH
  status: "pending" | "approved" | "rejected" | "void";

  team?: {
    p1_id: string | null;
    p2_id: string | null;
    p3_id: string | null;
  };

  team_display?: {
    p1_tag: string;
    p2_tag: string;
    p3_tag: string;
  };
};

type DraftEdit = {
  map_number: string;
  player1_kills: string;
  player2_kills: string;
  player3_kills: string;
  placement: string; // '' allowed => null
};

const POLL_INTERVAL_MS = 10_000;

function pickTeam(team: TeamJoinShape): EstablishedTeamRow | null {
  if (!team) return null;
  return Array.isArray(team) ? team[0] ?? null : team;
}

function normalizeStatus(s: string): Submission["status"] {
  if (s === "approved" || s === "rejected" || s === "pending" || s === "void") return s;
  return "pending";
}

function toIntOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function toIntOrZero(v: string): number {
  const t = v.trim();
  const n = Number.parseInt(t || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function makeDraftFromSubmission(s: Submission): DraftEdit {
  return {
    map_number: String(s.map_number ?? ""),
    player1_kills: String(s.player1_kills ?? 0),
    player2_kills: String(s.player2_kills ?? 0),
    player3_kills: String(s.player3_kills ?? 0),
    placement: s.placement === null || s.placement === undefined ? "" : String(s.placement),
  };
}

function shortId(id: string) {
  return id.slice(0, 8);
}

const compactInputStyle: React.CSSProperties = {
  width: 44,
  height: 26,
  fontSize: 12,
  padding: "2px 6px",
  borderRadius: 8,
  textAlign: "center",
};

const compactKillsStyle: React.CSSProperties = {
  ...compactInputStyle,
  width: 40,
};

const AdminDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // drafts per submission id
  const [drafts, setDrafts] = useState<Record<string, DraftEdit>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  // gamertag map for player ids
  const [gamertagById, setGamertagById] = useState<Record<string, string>>({});

  const hydrateGamertags = async (normalized: Submission[]) => {
    const ids = new Set<string>();
    for (const s of normalized) {
      if (s.team?.p1_id) ids.add(s.team.p1_id);
      if (s.team?.p2_id) ids.add(s.team.p2_id);
      if (s.team?.p3_id) ids.add(s.team.p3_id);
    }
    const all = Array.from(ids);
    if (all.length === 0) {
      setGamertagById({});
      return;
    }

    const { data, error } = await supabase.from("profiles").select("id, gamertag").in("id", all);
    if (error) {
      console.error("profiles fetch error:", error);
      return;
    }

    const map: Record<string, string> = {};
    (data ?? []).forEach((p: any) => {
      if (p?.id) map[p.id] = (p.gamertag ?? "").trim();
    });
    setGamertagById(map);
  };

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("submissions")
      .select(
        `
        id,
        tourney_id,
        team_id,
        map_number,
        player1_kills,
        player2_kills,
        player3_kills,
        placement,
        scoreboard_image_url,
        status,
        created_at,
        team:"Established Teams" (
          "UUID",
          "Team Name",
          "Player 1",
          "Player 2",
          "Player 3"
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<SubmissionRow[]>();

    if (error) {
      console.error("Error fetching submissions:", error);
      setLoading(false);
      return;
    }

    const normalized: Submission[] = (data ?? []).map((r) => {
      const t0 = pickTeam(r.team);

      const p1_id = t0?.["Player 1"] ?? null;
      const p2_id = t0?.["Player 2"] ?? null;
      const p3_id = t0?.["Player 3"] ?? null;

      return {
        id: r.id,
        tourney_id: r.tourney_id,
        team_id: r.team_id,
        map_number: r.map_number,
        player1_kills: r.player1_kills,
        player2_kills: r.player2_kills,
        player3_kills: r.player3_kills,
        placement: r.placement,
        scoreboard_image_url: r.scoreboard_image_url,
        status: normalizeStatus(r.status),
        team: t0
          ? {
              p1_id,
              p2_id,
              p3_id,
            }
          : undefined,
      };
    });

    setSubmissions(normalized);
    setLoading(false);

    // drafts: keep user typing stable through polling
    setDrafts((prev) => {
      const next = { ...prev };

      for (const s of normalized) {
        if (!next[s.id]) next[s.id] = makeDraftFromSubmission(s);
      }

      for (const id of Object.keys(next)) {
        if (!normalized.some((x) => x.id === id)) delete next[id];
      }

      return next;
    });

    // rowBusy cleanup
    setRowBusy((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!normalized.some((x) => x.id === id)) delete next[id];
      }
      return next;
    });

    // hydrate gamertags (once per fetch)
    hydrateGamertags(normalized);
  };

  const updateDraft = (submissionId: string, patch: Partial<DraftEdit>) => {
    setDrafts((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] ?? {
          map_number: "",
          player1_kills: "",
          player2_kills: "",
          player3_kills: "",
          placement: "",
        }),
        ...patch,
      },
    }));
  };

  const approve = async (submissionId: string) => {
    const draft = drafts[submissionId];
    if (!draft) return;

    const payload = {
      map_number: toIntOrZero(draft.map_number),
      player1_kills: toIntOrZero(draft.player1_kills),
      player2_kills: toIntOrZero(draft.player2_kills),
      player3_kills: toIntOrZero(draft.player3_kills),
      placement: toIntOrNull(draft.placement), // can be null
    };

    const prev = submissions;
    setRowBusy((b) => ({ ...b, [submissionId]: true }));
    setSubmissions((cur) => cur.filter((s) => s.id !== submissionId));

    // ✅ RPC instead of direct update (bypasses RLS via SECURITY DEFINER)
    const { error } = await supabase.rpc("admin_approve_submission", {
      p_submission_id: submissionId,
      p_map_number: payload.map_number,
      p_player1_kills: payload.player1_kills,
      p_player2_kills: payload.player2_kills,
      p_player3_kills: payload.player3_kills,
      // IMPORTANT: your RPC signature uses int, not nullable
      // If placement can be null in your DB, your RPC must accept int or null (int4).
      // If your RPC currently accepts int only, we must send a number.
      p_placement: payload.placement ?? 0,
    });

    if (error) {
      console.error("Error approving submission:", error);
      setSubmissions(prev);
      setRowBusy((b) => ({ ...b, [submissionId]: false }));
      return;
    }

    setRowBusy((b) => {
      const next = { ...b };
      delete next[submissionId];
      return next;
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[submissionId];
      return next;
    });
  };


  const deny = async (submissionId: string) => {
    const prev = submissions;
    setRowBusy((b) => ({ ...b, [submissionId]: true }));
    setSubmissions((cur) => cur.filter((s) => s.id !== submissionId));

    // ✅ RPC instead of direct update
    const { error } = await supabase.rpc("admin_reject_submission", {
      p_submission_id: submissionId,
    });

    if (error) {
      console.error("Error rejecting submission:", error);
      setSubmissions(prev);
      setRowBusy((b) => ({ ...b, [submissionId]: false }));
      return;
    }

    setRowBusy((b) => {
      const next = { ...b };
      delete next[submissionId];
      return next;
    });
    setDrafts((d) => {
      const next = { ...d };
      delete next[submissionId];
      return next;
    });
  };


  useEffect(() => {
    fetchSubmissions();
    const intervalId = window.setInterval(fetchSubmissions, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submissionsWithDisplay = useMemo(() => {
    return submissions.map((s) => {
      const p1 = s.team?.p1_id ? gamertagById[s.team.p1_id] || shortId(s.team.p1_id) : "";
      const p2 = s.team?.p2_id ? gamertagById[s.team.p2_id] || shortId(s.team.p2_id) : "";
      const p3 = s.team?.p3_id ? gamertagById[s.team.p3_id] || shortId(s.team.p3_id) : "";
      return {
        ...s,
        team_display: {
          p1_tag: p1,
          p2_tag: p2,
          p3_tag: p3,
        },
      };
    });
  }, [submissions, gamertagById]);

  if (loading) return <p className="loading-text">Loading submissions...</p>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="header">
          <h1 className="title">Admin Dashboard</h1>

          <div className="button-group">
            <button className="refresh-button" onClick={fetchSubmissions}>
              <RefreshCcw size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="submission-table">
            <colgroup>
              <col className="col-map" />
              <col className="col-kills" />
              <col className="col-placement" />
              <col className="col-toggle" />
              <col className="col-scoreboard" />
            </colgroup>

            <thead>
              <tr className="table-header-row">
                <th className="table-header">Map #</th>
                <th className="table-header">Kills</th>
                <th className="table-header">Placement</th>
                <th className="table-header">Actions</th>
                <th className="table-header">Scoreboard</th>
              </tr>
            </thead>

            <tbody>
              {submissionsWithDisplay.map((s) => {
                const draft = drafts[s.id] ?? makeDraftFromSubmission(s);
                const busy = !!rowBusy[s.id];

                return (
                  <tr key={s.id} className="table-row">
                    {/* Map # */}
                    <td className="table-cell cell-center">
                      <input
                        className="admin-input"
                        style={compactInputStyle}
                        value={draft.map_number}
                        onChange={(e) => updateDraft(s.id, { map_number: e.target.value })}
                        inputMode="numeric"
                      />
                    </td>

                    {/* Kills */}
                    <td className="table-cell">
                      <div className="players-cell">
                        <div className="player-line">
                          <span className="player-name">{s.team_display?.p1_tag ?? ""}</span>
                          <input
                            className="admin-input admin-input-kills"
                            style={compactKillsStyle}
                            value={draft.player1_kills}
                            onChange={(e) => updateDraft(s.id, { player1_kills: e.target.value })}
                            inputMode="numeric"
                          />
                        </div>

                        <div className="player-line">
                          <span className="player-name">{s.team_display?.p2_tag ?? ""}</span>
                          <input
                            className="admin-input admin-input-kills"
                            style={compactKillsStyle}
                            value={draft.player2_kills}
                            onChange={(e) => updateDraft(s.id, { player2_kills: e.target.value })}
                            inputMode="numeric"
                          />
                        </div>

                        <div className="player-line">
                          <span className="player-name">{s.team_display?.p3_tag ?? ""}</span>
                          <input
                            className="admin-input admin-input-kills"
                            style={compactKillsStyle}
                            value={draft.player3_kills}
                            onChange={(e) => updateDraft(s.id, { player3_kills: e.target.value })}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Placement */}
                    <td className="table-cell cell-center">
                      <input
                        className="admin-input"
                        style={compactInputStyle}
                        value={draft.placement}
                        onChange={(e) => updateDraft(s.id, { placement: e.target.value })}
                        inputMode="numeric"
                        placeholder=""
                      />
                    </td>

                    {/* Actions */}
                    <td className="table-cell cell-center">
                      <div className="action-buttons">
                        <button className="approve-btn" disabled={busy} onClick={() => approve(s.id)}>
                          Approve
                        </button>
                        <button className="deny-btn" disabled={busy} onClick={() => deny(s.id)}>
                          Deny
                        </button>
                      </div>
                    </td>

                    {/* Scoreboard */}
                    <td className="table-cell cell-center">
                      {s.scoreboard_image_url ? (
                        <a
                          className="scoreboard-link"
                          href={`https://lvykhhqznqivfswtijpu.supabase.co/storage/v1/object/public/scoreboards/${s.scoreboard_image_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ScoreboardPreview imageUrl={s.scoreboard_image_url} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {submissionsWithDisplay.length === 0 && (
                <tr>
                  <td className="table-cell cell-center" colSpan={5}>
                    No pending submissions 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
          All numeric fields are editable. Clicking <b>Approve</b> saves the current values to the database.
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
