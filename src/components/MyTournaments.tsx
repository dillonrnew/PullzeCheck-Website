import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/MyTournamentsPage.css';

type TeamRow = {
  UUID: string;
  'Team Name': string | null;
  'Player 1': string | null;
  'Player 2': string | null;
  'Player 3': string | null;
};

type RegistrationRow = {
  id: string;
  tourney_id: string;
  team_id: string;
  confirmed: boolean;
  created_at: string;
};

type TournamentRow = {
  UUID: string;
  'Tourney Name': string;
  'Status': 'upcoming' | 'ongoing' | 'completed' | string;
  'Start Time': string | null;
  'Prize Pool': number | null;
  'Teams Assigned': number | null;
  'Teams Total': number | null;
  'Image': string | null;
};

type MyTourneyItem = {
  tournament: TournamentRow;
  team: TeamRow;
  registration: RegistrationRow;
};

const MyTournaments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<MyTourneyItem[]>([]);
  const [search, setSearch] = useState('');

  const hardcodedImage =
    'https://pbs.twimg.com/media/G8QePF8WMAglc6h?format=jpg&name=large';

  useEffect(() => {
    const fetchMine = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const userId = authData.user?.id;
        if (!userId) {
          setItems([]);
          setErrorMsg('You must be logged in to view your tournaments.');
          return;
        }

        // 1) My teams
        const orFilter = `"Player 1".eq.${userId},"Player 2".eq.${userId},"Player 3".eq.${userId}`;

        const { data: myTeams, error: teamsErr } = await supabase
          .from('Established Teams')
          .select(`"UUID","Team Name","Player 1","Player 2","Player 3"`)
          .or(orFilter);

        if (teamsErr) throw teamsErr;

        const teams = (myTeams as TeamRow[]) ?? [];
        const teamIds = teams.map((t) => t.UUID);

        if (teamIds.length === 0) {
          setItems([]);
          return;
        }

        // 2) Registrations for my teams
        const { data: regsRaw, error: regErr } = await supabase
          .from('tourney_registrations')
          .select(`id,tourney_id,team_id,confirmed,created_at`)
          .in('team_id', teamIds)
          .order('created_at', { ascending: false });

        if (regErr) throw regErr;

        const regs = (regsRaw as RegistrationRow[]) ?? [];
        if (regs.length === 0) {
          setItems([]);
          return;
        }

        // 3) Fetch tournaments referenced by registrations
        const tourneyIds = Array.from(new Set(regs.map((r) => r.tourney_id)));

        const { data: tourneysRaw, error: tErr } = await supabase
          .from('tournaments')
          .select(
            `
            "UUID",
            "Tourney Name",
            "Status",
            "Start Time",
            "Prize Pool",
            "Teams Assigned",
            "Teams Total",
            "Image"
          `
          )
          .in('UUID', tourneyIds);

        if (tErr) throw tErr;

        const tourneys = (tourneysRaw as TournamentRow[]) ?? [];
        const tourneyById: Record<string, TournamentRow> = {};
        tourneys.forEach((t) => (tourneyById[t.UUID] = t));

        const teamById: Record<string, TeamRow> = {};
        teams.forEach((t) => (teamById[t.UUID] = t));

        // 4) Merge into items
        const merged: MyTourneyItem[] = regs
          .map((r) => {
            const tournament = tourneyById[r.tourney_id];
            const team = teamById[r.team_id];
            if (!tournament || !team) return null;
            return { tournament, team, registration: r };
          })
          .filter(Boolean) as MyTourneyItem[];

        setItems(merged);
      } catch (e: any) {
        console.error('MyTournaments error:', e);
        setErrorMsg(e?.message || 'Failed to load your tournaments.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMine();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const tn = it.tournament['Tourney Name']?.toLowerCase() ?? '';
      const teamName = (it.team['Team Name'] ?? '').toLowerCase();
      return tn.includes(q) || teamName.includes(q);
    });
  }, [items, search]);

  const formatStart = (iso: string | null) => {
    if (!iso) return { date: 'TBD', time: 'TBD' };
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const formatPrize = (p: number | null) => {
    if (p === null || p === undefined) return 'TBD';
    return `$${Number(p).toLocaleString()}`;
  };

  return (
    <div className="my-tourney-page">
      <div className="my-tourney-header">
        <h1>My Tournaments</h1>

        <input
          className="my-tourney-search"
          placeholder="Search tournaments or teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="my-tourney-empty">Loading…</div>
      ) : errorMsg ? (
        <div className="my-tourney-empty">{errorMsg}</div>
      ) : filtered.length === 0 ? (
        <div className="my-tourney-empty">No tournaments found for your account.</div>
      ) : (
        <div className="my-tourney-grid">
          {filtered.map((it) => {
            const t = it.tournament;
            const team = it.team;
            const reg = it.registration;

            const img = t.Image || hardcodedImage;
            const start = formatStart(t['Start Time']);
            const prize = formatPrize(t['Prize Pool']);
            const assigned = t['Teams Assigned'] ?? 0;
            const total = t['Teams Total'] ?? 0;

            return (
              <div key={reg.id} className="my-tourney-card">
                <div className="my-tourney-image">
                  <img src={img} alt={t['Tourney Name']} />
                </div>

                <div className="my-tourney-body">
                  <div className="my-tourney-title-row">
                    <div className="my-tourney-title">{t['Tourney Name']}</div>

                    <div className={`my-tourney-pill ${reg.confirmed ? 'ok' : 'wait'}`}>
                      {reg.confirmed ? 'Confirmed' : 'Pending'}
                    </div>
                  </div>

                  <div className="my-tourney-sub">
                    Team: <span className="em">{team['Team Name'] || 'Unnamed Team'}</span>
                  </div>

                  <div className="my-tourney-stats">
                    <div className="stat">
                      <div className="label">Start</div>
                      <div className="value">
                        {start.date} • {start.time}
                      </div>
                    </div>

                    <div className="stat">
                      <div className="label">Prize</div>
                      <div className="value">{prize}</div>
                    </div>

                    <div className="stat wide">
                      <div className="label">Teams</div>
                      <div className="value">
                        {assigned} / {total || 'TBD'}
                      </div>
                    </div>
                  </div>

                  <div className="my-tourney-actions">
                    <Link to={`/tourney/${t.UUID}`} className="btn secondary">
                      View
                    </Link>

                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => navigator.clipboard.writeText(team.UUID)}
                      title="Copy your team id (optional)"
                    >
                      Copy Team
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

export default MyTournaments;
