// src/components/TourneyGrid.tsx
import { useEffect, useState } from 'react';
import TourneyCard, { type TourneyCardTourney } from './TourneyCard';
import { supabase } from '../supabaseClient';
import '../styles/TournamentPage.css';

// Matches your tournaments table (quoted columns with spaces)
export type TourneyRow = {
  UUID: string;                 // uuid comes back as string
  'Tourney Name': string;
  'Sheet Link': string | null;
  Status: 'upcoming' | 'ongoing' | 'completed';
  'Teams Assigned': number | null;
  'Teams Total': number | null;
  'Prize Pool': number | null;
  'Start Time': string | null;  // timestamptz comes back as ISO string
  Image: string | null;
};

type TourneyGridProps = {
  onViewTourney?: (tourney: TourneyCardTourney) => void;
};

const TourneyGrid: React.FC<TourneyGridProps> = ({ onViewTourney }) => {
  const [tourneys, setTourneys] = useState<TourneyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchTourneys = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from('tournaments')
        .select(
          `
          UUID,
          "Tourney Name",
          "Sheet Link",
          "Status",
          "Teams Assigned",
          "Teams Total",
          "Prize Pool",
          "Start Time",
          "Image"
        `
        )
        .order('Start Time', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('fetchTourneys error:', error);
        setErrorMsg(error.message);
        setTourneys([]);
        setLoading(false);
        return;
      }

      setTourneys((data as TourneyRow[]) ?? []);
      setLoading(false);
    };

    fetchTourneys();
  }, []);

  return (
    <div className="teams-grid-container">
      <h1 className="grid-title">Select Your Tourney</h1>

      {loading ? (
        <p>Loading…</p>
      ) : errorMsg ? (
        <p>{errorMsg}</p>
      ) : tourneys.length === 0 ? (
        <p>No Active Tourneys.</p>
      ) : (
        <div className="teams-grid">
          {tourneys.map((t) => {
            const mapped: TourneyCardTourney = {
              id: t.UUID,
              title: t['Tourney Name'],
              start_time: t['Start Time'],
              prize_pool: t['Prize Pool'],
              teams_signed_up: t['Teams Assigned'],
              teams_possible: t['Teams Total'],
              google_sheet_link: t['Sheet Link'] ?? '',
              image: t.Image,
              status: t.Status,
            };

            return (
              <TourneyCard
                key={t.UUID}
                tourney={mapped}
                onView={onViewTourney}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TourneyGrid;
