// src/pages/LandingPage.tsx
import { useParams } from 'react-router-dom';
import TeamsGrid from '../components/TeamsGrid';

const LandingPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  if (!tournamentId || Number.isNaN(Number(tournamentId))) {
    return <p>Invalid tournament.</p>;
  }

  return <TeamsGrid tournamentId={Number(tournamentId)} />;
};

export default LandingPage;
