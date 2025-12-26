// src/components/tourneyDetails/panels/ParticipantsPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import type { ProfileRow, RegistrationRow } from "../types";
import { coerceSingle, uniqNonNull } from "../utils";
import { btn, Group, Grid } from "../ui";
import ParticipantTeamCard from "../components/ParticipantTeamCard";

const ParticipantsPanel: React.FC<{ tourneyId: string }> = ({ tourneyId }) => {
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [gamertagById, setGamertagById] = useState<Record<string, string>>({});

  const fetchParticipants = async () => {
    setParticipantsLoading(true);
    setParticipantsError(null);

    try {
      const { data: regData, error: regErr } = await supabase
        .from("tourney_registrations")
        .select(
          `
          id,
          tourney_id,
          team_id,
          created_at,
          confirmed,
          team:"Established Teams" (
            "UUID",
            "Team Name",
            "Team Logo",
            "Player 1",
            "Player 2",
            "Player 3",
            "Player 1 Confirmed",
            "Player 2 Confirmed",
            "Player 3 Confirmed",
            "Team Confirmed"
          )
        `
        )
        .eq("tourney_id", tourneyId)
        .order("confirmed", { ascending: false })
        .order("created_at", { ascending: true });

      if (regErr) throw regErr;

      const regs = ((regData as any) ?? []) as RegistrationRow[];
      setRegistrations(regs);

      const allPlayerIds = uniqNonNull(
        regs.flatMap((r) => {
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
      console.error("fetchParticipants error:", e);
      setRegistrations([]);
      setGamertagById({});
      setParticipantsError(e?.message ?? "Failed to load participants.");
    } finally {
      setParticipantsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourneyId]);

  const confirmedRegs = useMemo(() => registrations.filter((r) => r.confirmed === true), [registrations]);
  const pendingRegs = useMemo(() => registrations.filter((r) => r.confirmed === false), [registrations]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Participants</h2>
        <button type="button" onClick={fetchParticipants} style={btn("#14182d")}>
          Refresh
        </button>
      </div>

      <div style={{ height: 12 }} />

      {participantsLoading ? (
        <div style={{ opacity: 0.85 }}>Loading participants…</div>
      ) : participantsError ? (
        <div style={{ color: "#ffb4b4", fontWeight: 800 }}>{participantsError}</div>
      ) : registrations.length === 0 ? (
        <div style={{ opacity: 0.85 }}>No teams registered yet.</div>
      ) : (
        <>
          <Group title={`✅ Confirmed (${confirmedRegs.length})`}>
            {confirmedRegs.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No confirmed teams yet.</div>
            ) : (
              <Grid>
                {confirmedRegs.map((r) => (
                  <ParticipantTeamCard key={r.id} reg={r} gamertagById={gamertagById} />
                ))}
              </Grid>
            )}
          </Group>

          <Group title={`⏳ Pending (${pendingRegs.length})`}>
            {pendingRegs.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No pending teams.</div>
            ) : (
              <Grid>
                {pendingRegs.map((r) => (
                  <ParticipantTeamCard key={r.id} reg={r} gamertagById={gamertagById} />
                ))}
              </Grid>
            )}
          </Group>
        </>
      )}
    </div>
  );
};

export default ParticipantsPanel;
