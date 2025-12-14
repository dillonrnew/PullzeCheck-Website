import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/teamPage.css';

const TeamPage: React.FC<{ teamId: number }> = ({ teamId }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [mapNumber, setMapNumber] = useState<number>(1);
  const [placement, setPlacement] = useState<number>(0);
  const [playerKills, setPlayerKills] = useState([0, 0, 0]);
  const [submitting, setSubmitting] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      alert('Please upload or paste a scoreboard image.');
      return;
    }

    setSubmitting(true);

    try {
      // 1️⃣ Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `team${teamId}_map${mapNumber}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('scoreboards')
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 2️⃣ Get public URL (no error property)
      const { data: publicData } = supabase.storage
        .from('scoreboards')
        .getPublicUrl(fileName);

      const imageUrl = publicData.publicUrl;

      // 3️⃣ Insert submission row into Supabase
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          team_id: teamId,
          map_number: mapNumber,
          player1_kills: playerKills[0],
          player2_kills: playerKills[1],
          player3_kills: playerKills[2],
          placement,
          scoreboard_image_url: imageUrl,
        });

      if (insertError) throw insertError;

      alert('Submission uploaded successfully!');

      // Reset form for next map
      setMapNumber(prev => prev + 1);
      setPlacement(0);
      setPlayerKills([0, 0, 0]);
      setImageFile(null);
      setImagePreview('');
    } catch (error: any) {
      console.error('Submission error:', error);
      alert('Failed to submit. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="team-page">
      <div className="form-container">
        <h1>Submit Your Score</h1>
        <form onSubmit={handleSubmit}>
          <label>Map Number</label>
          <input
            type="number"
            value={mapNumber}
            onChange={e => setMapNumber(Number(e.target.value))}
            required
          />

          <label>Map Placement</label>
          <select
            value={placement || ''}
            onChange={e => setPlacement(Number(e.target.value))}
            required
          >
            <option value="" disabled>
              Select placement
            </option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(i => (
              <option key={i} value={i}>
                {i}
                {i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'}
              </option>
            ))}
          </select>

          {['Player 1', 'Player 2', 'Player 3'].map((player, idx) => (
            <div key={idx}>
              <label>{player} Kills</label>
              <input
                type="number"
                value={playerKills[idx]}
                onChange={e =>
                  setPlayerKills(prev => {
                    const copy = [...prev];
                    copy[idx] = Number(e.target.value);
                    return copy;
                  })
                }
                required
              />
            </div>
          ))}

          <label>Upload or Paste Scoreboard</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <textarea
            placeholder="Paste image with Ctrl+V"
            rows={4}
            readOnly
            value={imagePreview}
          ></textarea>

          {imagePreview && (
            <img id="image-preview" src={imagePreview} alt="Preview" />
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeamPage;
