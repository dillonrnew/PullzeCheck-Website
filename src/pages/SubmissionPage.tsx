import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ScoreSubmissionForm from '../components/ScoreSubmissionForm';

const TeamPage: React.FC = () => {
  const { tournamentId, teamNumber } = useParams<{ tournamentId: string; teamNumber: string }>();

  const parsed = useMemo(() => {
    const tId = Number(tournamentId);
    const tNum = Number(teamNumber);
    const valid = Boolean(tournamentId && teamNumber) && !Number.isNaN(tId) && !Number.isNaN(tNum);
    return { valid, tId, tNum };
  }, [tournamentId, teamNumber]);

  if (!parsed.valid) {
    return <p>Invalid route. Expected /submit/:tournamentId/:teamNumber</p>;
  }

  return <ScoreSubmissionForm tournamentId={parsed.tId} teamNumber={parsed.tNum} maxMaps={8} />;
};

export default TeamPage;
