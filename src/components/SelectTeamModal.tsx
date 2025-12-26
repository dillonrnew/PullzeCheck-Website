import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/TeamCard.css';

type EstablishedTeamRow = {
  UUID: string;
  'Team Name': string | null;
  'Player 1': string | null;
  'Player 2': string | null;
  'Player 3': string | null;
  'Team Confirmed': boolean;
  'Team Logo': string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // If you want to use this later to register a team for a tournament
  tourneyId: string;

  // Called when user selects a team
  onSelect: (team: EstablishedTeamRow) => Promise<void> | void;
};

const SelectTeamModal: React.FC<Props> = ({ open, onClose, tourneyId, onSelect }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [teams, setTeams] = useState<EstablishedTeamRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;

    const fetchTeams = async () => {
      setLoading(true);
      setErrorMsg(null);
      setTeams([]);
      setSearch('');

      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const userId = authData.user?.id;
        if (!userId) {
          setErrorMsg('You must be logged in to select a team.');
          setLoading(false);
          return;
        }

        // IMPORTANT: table + columns have spaces, so we use exact strings.
        // .or() format: "col.eq.value,col.eq.value,..."
        const orFilter = `"Player 1".eq.${userId},"Player 2".eq.${userId},"Player 3".eq.${userId}`;

        const { data, error } = await supabase
          .from('Established Teams')
          .select(
            `
            "UUID",
            "Team Name",
            "Player 1",
            "Player 2",
            "Player 3",
            "Team Confirmed",
            "Team Logo"
          `
          )
          .or(orFilter)
          .order('Team Name', { ascending: true });

        if (error) throw error;

        setTeams((data as EstablishedTeamRow[]) ?? []);
      } catch (e: any) {
        console.error('SelectTeamModal error:', e);
        setErrorMsg(e?.message || 'Failed to load your teams.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [open]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;

    return teams.filter((t) => {
      const name = (t['Team Name'] ?? '').toLowerCase();
      const uuid = (t.UUID ?? '').toLowerCase();
      return name.includes(q) || uuid.includes(q);
    });
  }, [teams, search]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Select team modal">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Select Team</div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-subtitle">Pick a team you’re on</div>

          {/* optional: show tourney id to confirm context */}
          <div style={{ textAlign: 'center', marginBottom: 12, color: '#cfd4ff', fontWeight: 700, fontSize: 12 }}>
            Tournament: {tourneyId}
          </div>

          <input
            className="modal-search"
            placeholder="Search team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="modal-empty">Loading…</div>
          ) : errorMsg ? (
            <div className="modal-empty">{errorMsg}</div>
          ) : filteredTeams.length === 0 ? (
            <div className="modal-empty">No teams found for your account.</div>
          ) : (
            <div className="modal-list">
              {filteredTeams.map((team) => (
                <div key={team.UUID} className="modal-list-item">
                  <div className="modal-list-left">
                    <div className="modal-list-title">
                      {team['Team Name'] || 'Unnamed Team'}
                      {!team['Team Confirmed'] && (
                        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>(Pending)</span>
                      )}
                    </div>

                    <div className="modal-list-sub">
                      {team.UUID}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="modal-btn primary"
                    onClick={async () => {
                      await onSelect(team);
                      onClose();
                    }}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer single">
          <button type="button" className="modal-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectTeamModal;
