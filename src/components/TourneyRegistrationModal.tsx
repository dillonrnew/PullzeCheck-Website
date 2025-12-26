import React, { useState } from 'react';
import '../styles/TeamCard.css';
import CreateTeamModal from './CreateTeamModal';
import SelectTeamModal from './SelectTeamModal';

type EstablishedTeamRow = {
  UUID: string;
  'Team Name': string | null;
  'Player 1': string | null;
  'Player 2': string | null;
  'Player 3': string | null;
  'Team Confirmed': boolean;
  'Team Logo': string | null;
};

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  tourneyId: string;
  title: string;
  startDate: string;
  startTime: string;
  prizePool: string;
  signed: number;
  possible: number | string;

  onCreateTeam: (payload: {
    teamName: string;
    player1UserId: string;
    player2UserId: string | null;
    player3UserId: string | null;
  }) => Promise<void> | void;

  // ✅ NEW: called when user selects a team in SelectTeamModal
  onSelectTeam: (team: EstablishedTeamRow) => Promise<void> | void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({
  open,
  onClose,
  tourneyId,
  title,
  startDate,
  startTime,
  prizePool,
  signed,
  possible,
  onCreateTeam,
  onSelectTeam,
}) => {
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showSelectTeamModal, setShowSelectTeamModal] = useState(false);

  if (!open) return null;

  const goCreate = () => {
    setShowCreateTeamModal(true);
  };

  const goSelect = () => {
    setShowSelectTeamModal(true);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Register</div>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="modal-subtitle">{title}</div>

            <div className="modal-row">
              <div className="modal-pill">
                <span className="modal-pill-label">Start</span>
                <span className="modal-pill-value">
                  {startDate} • {startTime}
                </span>
              </div>

              <div className="modal-pill">
                <span className="modal-pill-label">Prize</span>
                <span className="modal-pill-value">{prizePool}</span>
              </div>
            </div>

            <div className="modal-row">
              <div className="modal-pill">
                <span className="modal-pill-label">Teams</span>
                <span className="modal-pill-value">
                  {signed} / {possible}
                </span>
              </div>
            </div>

            <div className="modal-choice-grid">
              <button type="button" className="modal-choice primary" onClick={goCreate}>
                <div className="choice-title">Create Team</div>
                <div className="choice-desc">Start a new team and invite players.</div>
              </button>

              <button type="button" className="modal-choice secondary" onClick={goSelect}>
                <div className="choice-title">Select Team</div>
                <div className="choice-desc">Pick an existing team to register.</div>
              </button>
            </div>
          </div>

          <div className="modal-footer single">
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Create Team */}
      <CreateTeamModal
        open={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        tourneyId={tourneyId}
        onCreate={async (payload) => {
          await onCreateTeam(payload);
          setShowCreateTeamModal(false);
          onClose();
        }}
      />

      {/* Select Team */}
      <SelectTeamModal
        open={showSelectTeamModal}
        onClose={() => setShowSelectTeamModal(false)}
        tourneyId={tourneyId}
        onSelect={async (team) => {
          await onSelectTeam(team);
          setShowSelectTeamModal(false);
          onClose();
        }}
      />
    </>
  );
};

export default RegisterModal;
