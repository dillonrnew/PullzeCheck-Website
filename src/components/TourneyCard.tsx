// src/components/TourneyCard.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import TourneyRegistrationModal from './TourneyRegistrationModal';

type EstablishedTeamRow = {
  UUID: string;
  'Team Name': string | null;
  'Player 1': string | null;
  'Player 2': string | null;
  'Player 3': string | null;
  'Team Confirmed': boolean;
  'Team Logo': string | null;
};

export type TourneyCardTourney = {
  id: string; // tournaments."UUID"
  title: string; // tournaments."Tourney Name"
  google_sheet_link?: string | null;
  start_time?: string | null;
  prize_pool?: string | number | null;
  teams_signed_up?: number | null;
  teams_possible?: number | null;
  image?: string | null;
  status?: 'upcoming' | 'ongoing' | 'completed' | string;
  info?: any | null;
};

interface TourneyCardProps {
  tourney: TourneyCardTourney;
  onView?: (tourney: TourneyCardTourney) => void; // ✅ NEW
}

const InfoModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}> = ({ open, title, message, onClose }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-empty">{message}</div>
        </div>

        <div className="modal-footer single">
          <button type="button" className="modal-btn primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

/** ✅ Auth-required modal with Login + Register */
const AuthRequiredModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}> = ({ open, onClose, onLogin, onRegister }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Sign in required</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-empty">
            You must sign in (or create an account) to register for this tournament.
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="modal-btn secondary" onClick={onRegister}>
            Register
          </button>
          <button type="button" className="modal-btn primary" onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

const TourneyCard: React.FC<TourneyCardProps> = ({ tourney, onView }) => {
  const navigate = useNavigate();

  const hardcodedImage =
    'https://pbs.twimg.com/media/G8QePF8WMAglc6h?format=jpg&name=large';

  const imageSrc = tourney.image || hardcodedImage;

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [checkingRegister, setCheckingRegister] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState('Notice');
  const [infoMessage, setInfoMessage] = useState('');

  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);

  const start = tourney.start_time ? new Date(tourney.start_time) : null;

  const startDate = start
    ? start.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'TBD';

  const startTime = start
    ? start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'TBD';

  const prizePool =
    tourney.prize_pool === undefined || tourney.prize_pool === null || tourney.prize_pool === ''
      ? 'TBD'
      : typeof tourney.prize_pool === 'number'
      ? `$${tourney.prize_pool.toLocaleString()}`
      : tourney.prize_pool;

  const signed = tourney.teams_signed_up ?? 0;
  const possible = tourney.teams_possible ?? 'TBD';

  const isFull = useMemo(
    () => typeof possible === 'number' && signed >= possible,
    [signed, possible]
  );

  const showInfo = (title: string, message: string) => {
    setInfoTitle(title);
    setInfoMessage(message);
    setInfoOpen(true);
  };

  const openAuthRequired = () => {
    setAuthRequiredOpen(true);
  };

  const isAuthSessionMissingError = (e: any) => {
    const msg = String(e?.message ?? '').toLowerCase();
    return msg.includes('auth session missing') || msg.includes('session missing');
  };

  // ✅ Gate before opening Register
  const handleRegisterClick = async () => {
    if (checkingRegister) return;

    try {
      setCheckingRegister(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (authErr) {
        if (isAuthSessionMissingError(authErr)) {
          openAuthRequired();
          return;
        }
        throw authErr;
      }

      const userId = authData.user?.id;

      if (!userId) {
        openAuthRequired();
        return;
      }

      // 1) Find teams where user is Player 1/2/3
      const orFilter = `"Player 1".eq.${userId},"Player 2".eq.${userId},"Player 3".eq.${userId}`;

      const { data: myTeams, error: teamsErr } = await supabase
        .from('Established Teams')
        .select(`"UUID"`)
        .or(orFilter);

      if (teamsErr) throw teamsErr;

      const teamIds = (myTeams ?? []).map((t: any) => t.UUID).filter(Boolean) as string[];

      if (teamIds.length === 0) {
        setShowRegisterModal(true);
        return;
      }

      // 2) Check if any of those teams are already registered for this tournament
      const { data: regs, error: regErr } = await supabase
        .from('tourney_registrations')
        .select('id, team_id, confirmed')
        .eq('tourney_id', tourney.id)
        .in('team_id', teamIds)
        .limit(1);

      if (regErr) throw regErr;

      const existing = regs?.[0];

      if (existing) {
        if (existing.confirmed === false) {
          showInfo('Already pending', 'You are on a pending team for this tournament already.');
          return;
        }

        showInfo('Already registered', 'You are already registered for this tournament.');
        return;
      }

      setShowRegisterModal(true);
    } catch (e: any) {
      console.error('handleRegisterClick error:', e);

      if (isAuthSessionMissingError(e)) {
        openAuthRequired();
        return;
      }

      showInfo('Error', e?.message || 'Failed to check registration status.');
    } finally {
      setCheckingRegister(false);
    }
  };

  /** ✅ Helper so create/select can't run without auth */
  const requireAuthOrThrow = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error && isAuthSessionMissingError(error)) {
      openAuthRequired();
      throw new Error('Not signed in');
    }
    if (!data.user?.id) {
      openAuthRequired();
      throw new Error('Not signed in');
    }
    return data.user.id;
  };

  // ✅ NEW: view handler (switch HomePage panel if provided, else fallback to route)
  const handleViewClick = () => {
    if (onView) {
      onView(tourney);
      return;
    }
    navigate(`/tourney/${tourney.id}`);
  };

  return (
    <>
      <div className="team-card">
        <div className="team-card-image">
          <img src={imageSrc} alt={tourney.title} />
        </div>

        <h2 className="team-card-title">{tourney.title}</h2>

        <div className="team-card-content">
          <div className="team-card-grid">
            <div className="info-box">
              <div className="info-label">Start</div>
              <div className="info-value">
                {startDate} • {startTime}
              </div>
            </div>

            <div className="info-box">
              <div className="info-label">Prize Pool</div>
              <div className="info-value">{prizePool}</div>
            </div>

            <div className="info-box info-box-wide">
              <div className="info-label">Teams</div>
              <div className="info-value">
                {signed} / {possible}
              </div>
            </div>

            <button
              type="button"
              className={`info-box button-box primary ${isFull ? 'disabled' : ''}`}
              onClick={handleRegisterClick}
              disabled={isFull || checkingRegister}
              title={checkingRegister ? 'Checking…' : undefined}
            >
              {isFull ? 'Full' : checkingRegister ? 'Checking…' : 'Register'}
            </button>

            <button
              type="button"
              className="info-box button-box secondary"
              onClick={handleViewClick}
            >
              View
            </button>
          </div>
        </div>
      </div>

      <TourneyRegistrationModal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        tourneyId={tourney.id}
        title={tourney.title}
        startDate={startDate}
        startTime={startTime}
        prizePool={prizePool}
        signed={signed}
        possible={possible}
        onCreateTeam={async ({ teamName, player1UserId, player2UserId, player3UserId }) => {
          await requireAuthOrThrow();

          const { error } = await supabase.from('Established Teams').insert({
            'Team Name': teamName,
            'Player 1': player1UserId,
            'Player 2': player2UserId,
            'Player 3': player3UserId,
            'Team Confirmed': false,
            'Team Logo': null,
          });

          if (error) throw error;
        }}
        onSelectTeam={async (team: EstablishedTeamRow) => {
          await requireAuthOrThrow();

          const { error } = await supabase.from('tourney_registrations').insert({
            tourney_id: tourney.id,
            team_id: team.UUID,
          });

          if (error) {
            if ((error as any).code === '23505') {
              showInfo('Already registered', 'That team is already registered for this tournament.');
              return;
            }
            throw error;
          }

          showInfo('Registered', 'Team registered! Waiting for admin confirmation.');
        }}
      />

      <AuthRequiredModal
        open={authRequiredOpen}
        onClose={() => setAuthRequiredOpen(false)}
        onLogin={() => {
          setAuthRequiredOpen(false);
          navigate('/login');
        }}
        onRegister={() => {
          setAuthRequiredOpen(false);
          navigate('/signup');
        }}
      />

      <InfoModal
        open={infoOpen}
        title={infoTitle}
        message={infoMessage}
        onClose={() => setInfoOpen(false)}
      />
    </>
  );
};

export default TourneyCard;
