import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import '../styles/SubmissionPage.css';
import '../styles/TopBar.css';

type Team = {
  id: number;
  tournament_id: number;
  team_number: number;
  name: string;
  player1_name: string;
  player2_name: string;
  player3_name: string;
};

type SubmissionStatus = 'approved' | 'exported' | 'pending' | 'rejected';

type SubmissionRow = {
  map_number: number;
  status: SubmissionStatus;
};

type Props = {
  tournamentId: number;
  teamNumber: number;
  maxMaps?: number; // default 15
};

const ScoreSubmissionForm: React.FC<Props> = ({ tournamentId, teamNumber, maxMaps = 15 }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Top bar state
  const [availableMaps, setAvailableMaps] = useState<number[]>([]);
  const [loadingMaps, setLoadingMaps] = useState<boolean>(true);
  const [mapsError, setMapsError] = useState<string | null>(null);

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedMap, setSelectedMap] = useState<number>(1);
  const [placement, setPlacement] = useState<number>(0);
  const [playerKills, setPlayerKills] = useState(['', '', '']);
  const [submitting, setSubmitting] = useState(false);

  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Compression options
  const compressionOptions = useMemo(
    () => ({
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      initialQuality: 0.85,
    }),
    []
  );

  // -----------------------------
  // Fetch team
  // -----------------------------
  useEffect(() => {
    const fetchTeam = async () => {
      setLoadingTeam(true);

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('team_number', teamNumber)
        .limit(1);

      if (error) {
        console.error('Error fetching team:', error);
        setTeam(null);
      } else {
        setTeam((data as Team[] | null)?.[0] ?? null);
      }

      setLoadingTeam(false);
    };

    fetchTeam();
  }, [tournamentId, teamNumber]);

  // -----------------------------
  // Fetch available maps
  // -----------------------------
  const fetchAvailableMaps = async (tournament_id: number, team_id: number) => {
    try {
      setLoadingMaps(true);
      setMapsError(null);

      const { data, error } = await supabase
        .from('submissions')
        .select('map_number, status')
        .eq('tournament_id', tournament_id)
        .eq('team_id', team_id)
        .in('status', ['approved', 'exported'])
        .order('map_number', { ascending: true });

      if (error) throw error;

      const disallowed = new Set((data as SubmissionRow[] | null)?.map((s) => s.map_number) ?? []);
      const maps = Array.from({ length: maxMaps }, (_, i) => i + 1).filter((m) => !disallowed.has(m));

      setAvailableMaps(maps);

      // Ensure selectedMap stays valid
      if (maps.length > 0 && !maps.includes(selectedMap)) {
        setSelectedMap(maps[0]);
      }
    } catch (err) {
      console.error('Failed to fetch available maps:', err);
      setMapsError('Failed to fetch submissions');
      setAvailableMaps([]);
    } finally {
      setLoadingMaps(false);
    }
  };

  useEffect(() => {
    if (!team) return;
    fetchAvailableMaps(team.tournament_id, team.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, team?.tournament_id, maxMaps]);

  // -----------------------------
  // Image handlers
  // -----------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await imageCompression(file, compressionOptions);
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error('Image compression failed:', error);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const processPastedImage = async (file: File) => {
    try {
      const compressedFile = await imageCompression(file, compressionOptions);
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error('Paste compression failed:', error);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!e.clipboardData) return;

    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.includes('image')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await processPastedImage(file);
        }
      }
    }
  };

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (document.activeElement === pasteTextareaRef.current) return;
      if (!e.clipboardData) return;

      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.includes('image')) {
          const file = item.getAsFile();
          if (file) await processPastedImage(file);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [compressionOptions]);

  // -----------------------------
  // Submit
  // -----------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!team) {
      alert('Team not found. Please check the link and try again.');
      return;
    }

    if (!imageFile) {
      alert('Please upload or paste a scoreboard image.');
      return;
    }

    const killsNums = playerKills.map((k) => (k === '' ? 0 : Number(k)));
    if (killsNums.some((n) => Number.isNaN(n))) {
      alert('Please enter valid numbers for player kills.');
      return;
    }

    setSubmitting(true);

    try {
      const fileName = `t${tournamentId}_team${teamNumber}_teamId${team.id}_map${selectedMap}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('scoreboards')
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('scoreboards').getPublicUrl(fileName);
      const imageUrl = publicData.publicUrl;

      const { error: insertError } = await supabase.from('submissions').insert({
        team_id: team.id,
        tournament_id: team.tournament_id,
        map_number: selectedMap,
        player1_kills: killsNums[0],
        player2_kills: killsNums[1],
        player3_kills: killsNums[2],
        placement,
        scoreboard_image_url: imageUrl,
      });

      if (insertError) throw insertError;

      alert('Submission uploaded successfully!');

      // refresh map bar (in case approvals/exported exist now / later you change logic)
      fetchAvailableMaps(team.tournament_id, team.id);

      // reset form
      setPlacement(0);
      setPlayerKills(['', '', '']);
      setImageFile(null);
      setImagePreview('');

      // optionally bump map selection
      setSelectedMap((prev) => Math.min(prev + 1, maxMaps));
    } catch (error: any) {
      console.error('Submission error:', error);
      alert('Failed to submit. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const pastePlaceholder = imagePreview
    ? '✓ Image added – Ctrl+V to replace'
    : 'Click here and press Ctrl+V to paste your scoreboard screenshot...';

  // -----------------------------
  // UI
  // -----------------------------
  if (loadingTeam) {
    return (
      <div className="team-page">
        <div className="form-container">
          <h1>Loading team...</h1>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="team-page">
        <div className="form-container">
          <h1>Team Not Found</h1>
          <p>
            No team #{teamNumber} found for tournament {tournamentId}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <h1 style={{ textAlign: 'center' }}>Submit Your Score</h1>

      {/* ✅ Entire “form card” is this component */}
      <div className="form-container">
        {/* ✅ Bar at the top of the form container */}
        {loadingMaps ? (
          <div>Loading...</div>
        ) : mapsError ? (
          <div>{mapsError}</div>
        ) : (
          <div className="top-bar">
            {availableMaps.map((mapNumber) => (
              <button
                key={mapNumber}
                className={`map-button ${selectedMap === mapNumber ? 'selected' : ''}`}
                onClick={() => setSelectedMap(mapNumber)}
                type="button"
              >
                Map {mapNumber}
              </button>
            ))}
          </div>
        )}

        <form className="SubmitForm" onSubmit={handleSubmit}>
          <label>Map Placement</label>
          <select value={placement || ''} onChange={(e) => setPlacement(Number(e.target.value))} required>
            <option value="" disabled>
              Select placement
            </option>
            {Array.from({ length: 17 }, (_, i) => i + 1).map((i) => (
              <option key={i} value={i}>
                {i}
                {i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'}
              </option>
            ))}
          </select>

          {[team.player1_name, team.player2_name, team.player3_name].map((player, idx) => (
            <div key={idx} className="kills-input-group">
              <label>{player} Kills</label>
              <input
                type="number"
                value={playerKills[idx]}
                onChange={(e) =>
                  setPlayerKills((prev) => {
                    const copy = [...prev];
                    copy[idx] = e.target.value;
                    return copy;
                  })
                }
                min="0"
                required
              />
            </div>
          ))}

          <label>Scoreboard Image</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />

          <label htmlFor="paste-area">Or paste your screenshot here:</label>
          <textarea
            id="paste-area"
            ref={pasteTextareaRef}
            placeholder={pastePlaceholder}
            rows={4}
            onPaste={handleTextareaPaste}
            className="paste-textarea"
          />

          {imagePreview && (
            <div className="preview-container">
              <p className="preview-label">Preview:</p>
              <div className="image-wrapper">
                <img src={imagePreview} alt="Scoreboard Preview" />
              </div>
            </div>
          )}

          <button type="submit" className="submit-score-btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Score'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScoreSubmissionForm;
