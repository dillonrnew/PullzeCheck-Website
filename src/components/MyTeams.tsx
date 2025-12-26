import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/MyTeams.css';

type EstablishedTeamRow = {
  UUID: string;
  'Team Name': string | null;

  'Player 1': string | null;
  'Player 2': string | null;
  'Player 3': string | null;

  'Player 1 Confirmed': boolean;
  'Player 2 Confirmed': boolean;
  'Player 3 Confirmed': boolean;

  'Team Confirmed': boolean;
};

type PublicProfileRow = {
  id: string;
  gamertag: string | null;
};

const MyTeams: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [teams, setTeams] = useState<EstablishedTeamRow[]>([]);
  const [search, setSearch] = useState('');

  const [meId, setMeId] = useState<string | null>(null);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [accepting, setAccepting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchMyTeams = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const userId = authData.user?.id ?? null;
        setMeId(userId);

        if (!userId) {
          setTeams([]);
          setErrorMsg('You must be logged in to view your teams.');
          return;
        }

        const orFilter = `"Player 1".eq.${userId},"Player 2".eq.${userId},"Player 3".eq.${userId}`;

        const { data, error } = await supabase
          .from('Established Teams')
          .select(`
            "UUID",
            "Team Name",
            "Player 1",
            "Player 2",
            "Player 3",
            "Player 1 Confirmed",
            "Player 2 Confirmed",
            "Player 3 Confirmed",
            "Team Confirmed"
          `)
          .or(orFilter)
          .order('Team Name', { ascending: true });

        if (error) throw error;

        const rows = (data as EstablishedTeamRow[]) ?? [];
        setTeams(rows);

        // Gather unique player ids to resolve gamertags
        const ids = Array.from(
          new Set(
            rows
              .flatMap((t) => [t['Player 1'], t['Player 2'], t['Player 3']])
              .filter(Boolean) as string[]
          )
        );

        if (ids.length > 0) {
          // Use public_profiles if you created it. If not, change to 'profiles'
          const { data: profiles, error: pErr } = await supabase
            .from('public_profiles')
            .select('id, gamertag')
            .in('id', ids);

          if (pErr) throw pErr;

          const map: Record<string, string> = {};
          (profiles as PublicProfileRow[] | null)?.forEach((p) => {
            if (p?.id) map[p.id] = p.gamertag || p.id;
          });

          setNameById(map);
        } else {
          setNameById({});
        }
      } catch (e: any) {
        console.error('MyTeams error:', e);
        setErrorMsg(e?.message || 'Failed to load your teams.');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => (t['Team Name'] ?? '').toLowerCase().includes(q));
  }, [teams, search]);

  const displayName = (id: string | null) => {
    if (!id) return '—';
    return nameById[id] || id;
  };

  const canAccept = (team: EstablishedTeamRow) => {
    if (!meId) return false;
    if (team['Player 2'] === meId) return team['Player 2 Confirmed'] === false;
    if (team['Player 3'] === meId) return team['Player 3 Confirmed'] === false;
    return false;
  };

  const acceptMySpot = async (team: EstablishedTeamRow) => {
    if (!meId) return;

    const key = team.UUID;
    setAccepting((s) => ({ ...s, [key]: true }));

    try {
      const patch: any = {};
      if (team['Player 2'] === meId) patch['Player 2 Confirmed'] = true;
      if (team['Player 3'] === meId) patch['Player 3 Confirmed'] = true;

      const { error } = await supabase
        .from('Established Teams')
        .update(patch)
        .eq('UUID', team.UUID);

      if (error) throw error;

      // update local state
      setTeams((prev) =>
        prev.map((t) => {
          if (t.UUID !== team.UUID) return t;
          return {
            ...t,
            ...(team['Player 2'] === meId ? { 'Player 2 Confirmed': true } : {}),
            ...(team['Player 3'] === meId ? { 'Player 3 Confirmed': true } : {}),
          };
        })
      );
    } catch (e: any) {
      console.error('acceptMySpot error:', e);
      setErrorMsg(e?.message || 'Failed to accept.');
    } finally {
      setAccepting((s) => ({ ...s, [key]: false }));
    }
  };

  return (
    <div className="my-teams-page">
      <div className="my-teams-header">
        <h1>My Teams</h1>

        <input
          className="my-teams-search"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="my-teams-empty">Loading…</div>
      ) : errorMsg ? (
        <div className="my-teams-empty">{errorMsg}</div>
      ) : filteredTeams.length === 0 ? (
        <div className="my-teams-empty">No teams found.</div>
      ) : (
        <div className="my-teams-grid">
          {filteredTeams.map((team) => {
            const pendingAccept = canAccept(team);

            return (
              <div key={team.UUID} className="my-team-card">
                <div className="my-team-top">
                  <div className="my-team-name">{team['Team Name'] || 'Unnamed Team'}</div>

                  <div className={`my-team-status ${team['Team Confirmed'] ? 'approved' : 'pending'}`}>
                    {team['Team Confirmed'] ? 'Approved' : 'Pending'}
                  </div>
                </div>

                <div className="my-team-players">
                  <div className="player-row">
                    <span className="role">Player 1</span>
                    <span className="gt">{displayName(team['Player 1'])}</span>
                    <span className={`pill ${team['Player 1 Confirmed'] ? 'ok' : 'wait'}`}>
                      {team['Player 1 Confirmed'] ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>

                  <div className="player-row">
                    <span className="role">Player 2</span>
                    <span className="gt">{displayName(team['Player 2'])}</span>
                    <span className={`pill ${team['Player 2 Confirmed'] ? 'ok' : 'wait'}`}>
                      {team['Player 2 Confirmed'] ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>

                  <div className="player-row">
                    <span className="role">Player 3</span>
                    <span className="gt">{displayName(team['Player 3'])}</span>
                    <span className={`pill ${team['Player 3 Confirmed'] ? 'ok' : 'wait'}`}>
                      {team['Player 3 Confirmed'] ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>

                {pendingAccept && (
                  <button
                    type="button"
                    className="my-btn primary single"
                    disabled={!!accepting[team.UUID]}
                    onClick={() => acceptMySpot(team)}
                  >
                    {accepting[team.UUID] ? 'Accepting…' : 'Accept Team Invite'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTeams;
