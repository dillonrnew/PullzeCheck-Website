// src/components/SubmitScoreModal.tsx
import React, { useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
  tourneyId: string;
  teamId: string;
  maxMaps?: number; // default 6
};

const SubmitScoreModal: React.FC<Props> = ({ open, onClose, tourneyId, teamId, maxMaps = 6 }) => {
  const [mapNumber, setMapNumber] = useState(1);
  const [placement, setPlacement] = useState<number>(0);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const totalKills = useMemo(() => {
    const a = Number(p1 || 0);
    const b = Number(p2 || 0);
    const c = Number(p3 || 0);
    return (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0) + (Number.isFinite(c) ? c : 0);
  }, [p1, p2, p3]);

  if (!open) return null;

  const compress = async (file: File) => {
    const opts = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    } as const;

    const compressed = await imageCompression(file, opts);
    return new File([compressed], `scoreboard.jpg`, { type: "image/jpeg" });
  };

  const uploadScoreboard = async (file: File) => {
    const safeName = `map_${mapNumber}_${Date.now()}.jpg`;
    const path = `${tourneyId}/${teamId}/${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from("scoreboards")
      .upload(path, file, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    // keep bucket private; we store just the path and generate signed urls when needed
    return path;
  };

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    setOk(null);

    try {
      if (!imageFile) throw new Error("Please upload a scoreboard image.");
      if (mapNumber < 1 || mapNumber > maxMaps) throw new Error(`Map number must be 1-${maxMaps}.`);
      if (placement < 1 || placement > 250) throw new Error("Placement must be >= 1.");
      const k1 = Number(p1 || 0);
      const k2 = Number(p2 || 0);
      const k3 = Number(p3 || 0);
      if ([k1, k2, k3].some((k) => !Number.isFinite(k) || k < 0)) throw new Error("Kills must be 0 or higher.");

      // compress + upload
      const compressed = await compress(imageFile);
      const storagePath = await uploadScoreboard(compressed);

      // upsert submissions row (unique on tourney_id, team_id, map_number)
      const payload = {
        tourney_id: tourneyId,
        team_id: teamId,
        map_number: mapNumber,
        placement,
        player1_kills: k1,
        player2_kills: k2,
        player3_kills: k3,
        scoreboard_image_url: storagePath, // store storage path (not a public url)
        status: "pending",
      };

      const { error } = await supabase
        .from("submissions")
        .upsert(payload, { onConflict: "tourney_id,team_id,map_number" });

      if (error) throw error;

      setOk("Submitted! Waiting for admin approval.");
      setImageFile(null);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 950 }}>Submit Score</div>
          <button style={btn("#2a2f55")} onClick={onClose}>✕</button>
        </div>

        <div style={{ height: 12 }} />

        {err && <div style={{ color: "#ffb4b4", fontWeight: 900, marginBottom: 10 }}>{err}</div>}
        {ok && <div style={{ color: "#b7ffcb", fontWeight: 900, marginBottom: 10 }}>{ok}</div>}

        <div style={grid}>
          <Field label="Map #">
            <select
              value={mapNumber}
              onChange={(e) => setMapNumber(Number(e.target.value))}
              style={input}
            >
              {Array.from({ length: maxMaps }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Map {n}</option>
              ))}
            </select>
          </Field>

          <Field label="Placement">
            <input
              style={input}
              type="number"
              value={placement}
              min={1}
              onChange={(e) => setPlacement(Number(e.target.value))}
            />
          </Field>

          <Field label="Player 1 Kills">
            <input style={input} type="number" value={p1} min={0} onChange={(e) => setP1(e.target.value)} />
          </Field>

          <Field label="Player 2 Kills">
            <input style={input} type="number" value={p2} min={0} onChange={(e) => setP2(e.target.value)} />
          </Field>

          <Field label="Player 3 Kills">
            <input style={input} type="number" value={p3} min={0} onChange={(e) => setP3(e.target.value)} />
          </Field>

          <Field label="Total Kills">
            <div style={{ ...input, display: "flex", alignItems: "center", fontWeight: 950 }}>
              {totalKills}
            </div>
          </Field>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Scoreboard Image</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              style={{ color: "white" }}
            />
          </div>
        </div>

        <div style={{ height: 14 }} />

        <button
          style={btn("#a777e4", true)}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default SubmitScoreModal;

/* ---------- small UI helpers ---------- */

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modal: React.CSSProperties = {
  width: "min(720px, 92vw)",
  background: "#0f1325",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  padding: 16,
  color: "white",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "#14182d",
  color: "white",
  outline: "none",
  fontWeight: 800,
  boxSizing: "border-box",
};

function btn(bg: string, darkText = false): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: bg,
    color: darkText ? "#000" : "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);
