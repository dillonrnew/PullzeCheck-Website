// src/pages/LandingPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import TeamCard from '../components/TeamCard';

const LandingPage = () => {
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('*');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  return (
    <div className="landing-container">
      <h1>Tournament Teams</h1>
      <div className="team-grid">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
