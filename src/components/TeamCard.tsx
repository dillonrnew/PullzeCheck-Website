// src/components/TeamCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface TeamCardProps {
  team: {
    id: number;
    name: string;
    logo_url: string;
  };
}

const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  return (
    <div className="team-card">
      <Link to={`/teams/${team.id}`}>
        <div className="team-card-content">
          <img src={team.logo_url} alt={team.name} className="team-logo" />
          <h2>{team.name}</h2>
        </div>
      </Link>
    </div>
  );
};

export default TeamCard;
