// src/components/TeamsGrid.tsx
import { useState, useEffect } from 'react';
import TeamCard from './TeamCard';
import { supabase } from '../supabaseClient';
import '../styles/TournamentTeamsPage.css';

// Exact match to your current teams table
type Team = {
  id: number;
  tournament_id: number;
  team_number: number;
  name: string;
  player1_name: string;
  player2_name: string;
  player3_name: string;
};

type TeamsGridProps = {
  tournamentId: number;
};

const TeamsGrid: React.FC<TeamsGridProps> = ({ tournamentId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId || Number.isNaN(Number(tournamentId))) {
      setTeams([]);
      setLoading(false);
      setErrorMsg('Invalid tournament id.');
      return;
    }

    let isMounted = true;

    const fetchTeams = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('team_number', { ascending: true });

      if (!isMounted) return;

      if (error) {
        setTeams([]);
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setTeams((data ?? []) as Team[]);
      setLoading(false);
    };

    fetchTeams();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  return (
    <div className="teams-grid-container">
      <h1 className="grid-title">Select Your Team</h1>

      {loading ? (
        <p>Loading teams...</p>
      ) : errorMsg ? (
        <p>{errorMsg}</p>
      ) : teams.length === 0 ? (
        <p>No teams registered yet.</p>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsGrid;
