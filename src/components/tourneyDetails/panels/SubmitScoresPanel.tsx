// src/components/tourneyDetails/panels/SubmitScoresPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../supabaseClient";
import imageCompression from "browser-image-compression";
import type { SubmissionRow } from "../types";
import { btn, Field, input } from "../ui";
import ConfirmModal from "../components/ConfirmModal";
import ModalShell from "../components/ModalShell";

const SubmitScoresPanel: React.FC<{
  tourneyId: string;
  teamId: string;
  teamName: string | null;
}> = ({ tourneyId, teamId, teamName }) => {
  const MAPS = 15;

  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const subByMap = useMemo(() => {
    const m: Record<number, SubmissionRow> = {};
    for (const s of subs) m[s.map_number] = s;
    return m;
  }, [subs]);

  const [mapToOpen, setMapToOpen] = useState<number | null>(null);
  const [confirmResubmitMap, setConfirmResubmitMap] = useState<number | null>(null);

  // modal fields (NO map here)
  const [placement, setPlacement] = useState<number>(0);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // paste + preview
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  const totalKills = useMemo(() => {
    const a = Number(p1 || 0);
    const b = Number(p2 || 0);
    const c = Number(p3 || 0);
    return (Number.isFinite(a) ? a : 0) + (Number.isFinite(b) ? b : 0) + (Number.isFinite(c) ? c : 0);
  }, [p1, p2, p3]);

  const setFileAndPreview = (file: File | null) => {
    setImageFile(file);
    if (!file) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const ext = blob.type.includes("png") ? "png" : "jpg";
        const file = new File([blob], `pasted-scoreboard.${ext}`, { type: blob.type });

        setFileAndPreview(file);
        e.preventDefault();
        return;
      }
    }
  };

  useEffect(() => {
    if (mapToOpen !== null) {
      setTimeout(() => pasteRef.current?.focus(), 50);
    }
  }, [mapToOpen]);

  const fetchMySubs = async () => {
    setLoading(true);
    setErr(null);

    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("tourney_id", tourneyId)
        .eq("team_id", teamId)
        .order("map_number", { ascending: true });

      if (error) throw error;
      setSubs(((data as any) ?? []) as SubmissionRow[]);
    } catch (e: any) {
      console.error("fetchMySubs error:", e);
      setSubs([]);
      setErr(e?.message ?? "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourneyId, teamId]);

  const primeModalForMap = (mapNum: number) => {
    const existing = subByMap[mapNum];
    if (existing) {
      setPlacement(existing.placement ?? 0);
      setP1(String(existing.player1_kills ?? 0));
      setP2(String(existing.player2_kills ?? 0));
      setP3(String(existing.player3_kills ?? 0));
      setFileAndPreview(null); // force new image on resubmit
    } else {
      setPlacement(0);
      setP1("");
      setP2("");
      setP3("");
      setFileAndPreview(null);
    }
  };

  const openMap = (mapNum: number) => {
    setMsg(null);
    setErr(null);

    const existing = subByMap[mapNum];
    if (existing) {
      setConfirmResubmitMap(mapNum);
      return;
    }

    primeModalForMap(mapNum);
    setMapToOpen(mapNum);
  };

  const compress = async (file: File) => {
    const opts = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    } as const;

    const compressed = await imageCompression(file, opts);
    return new File([compressed], "scoreboard.jpg", { type: "image/jpeg" });
  };

  const uploadScoreboard = async (mapNum: number, file: File) => {
    const safeName = `map_${mapNum}_${Date.now()}.jpg`;
    const path = `${tourneyId}/${teamId}/${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from("scoreboards")
      .upload(path, file, { contentType: "image/jpeg", upsert: false });

    if (uploadErr) throw uploadErr;
    return path;
  };

  const submit = async () => {
    if (!mapToOpen) return;

    setSubmitting(true);
    setErr(null);
    setMsg(null);

    try {
      if (!imageFile) throw new Error("Please upload or paste a scoreboard image.");
      if (placement < 1) throw new Error("Placement must be 1 or higher.");

      const k1 = Number(p1 || 0);
      const k2 = Number(p2 || 0);
      const k3 = Number(p3 || 0);
      if ([k1, k2, k3].some((k) => !Number.isFinite(k) || k < 0)) {
        throw new Error("Kills must be 0 or higher.");
      }

      const compressed = await compress(imageFile);
      const storagePath = await uploadScoreboard(mapToOpen, compressed);

      const payload = {
        tourney_id: tourneyId,
        team_id: teamId,
        map_number: mapToOpen,
        placement,
        player1_kills: k1,
        player2_kills: k2,
        player3_kills: k3,
        scoreboard_image_url: storagePath,
        status: "pending" as const,
      };

      const { error } = await supabase
        .from("submissions")
        .upsert(payload, { onConflict: "tourney_id,team_id,map_number" });

      if (error) throw error;

      setMsg(`Submitted Map ${mapToOpen}! Waiting for admin approval.`);
      setMapToOpen(null);
      await fetchMySubs();
    } catch (e: any) {
      console.error("submit score error:", e);
      setErr(e?.message ?? "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusPill = (s: SubmissionRow["status"]) => {
    const bg =
      s === "approved" ? "#2ecc71" : s === "pending" ? "#f1c40f" : s === "rejected" ? "#ff6b6b" : "#7f8c8d";

    return (
      <span style={{ padding: "4px 10px", borderRadius: 999, fontWeight: 950, fontSize: 12, background: bg, color: "#000" }}>
        {s.toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
          Submit Scores {teamName ? `• ${teamName}` : ""}
        </h2>

        <button type="button" onClick={fetchMySubs} disabled={loading} style={btn("#14182d")}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ height: 12 }} />

      {err && <div style={{ color: "#ffb4b4", fontWeight: 900, marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#b7ffcb", fontWeight: 900, marginBottom: 10 }}>{msg}</div>}

      <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "#14182d", padding: 14 }}>
        <div style={{ fontWeight: 950, marginBottom: 10 }}>Select a map</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {Array.from({ length: MAPS }, (_, i) => i + 1).map((mapNum) => {
            const existing = subByMap[mapNum];

            return (
              <button
                key={mapNum}
                type="button"
                onClick={() => openMap(mapNum)}
                style={{
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#0f1325",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 950 }}>Map {mapNum}</div>
                  {existing ? <div style={{ fontWeight: 950 }}>✅</div> : <div style={{ opacity: 0.5 }}>—</div>}
                </div>

                {existing ? statusPill(existing.status) : <span style={{ opacity: 0.65, fontWeight: 850 }}>Submit</span>}
              </button>
            );
          })}
        </div>
      </div>

      {confirmResubmitMap !== null && (
        <ConfirmModal
          title="Resubmit score?"
          body={`You already submitted Map ${confirmResubmitMap}. Are you sure you want to resubmit it? This will replace your previous submission and set it back to PENDING.`}
          confirmText="Yes, resubmit"
          cancelText="Cancel"
          onCancel={() => setConfirmResubmitMap(null)}
          onConfirm={() => {
            const m = confirmResubmitMap;
            setConfirmResubmitMap(null);
            primeModalForMap(m);
            setMapToOpen(m);
          }}
        />
      )}

      {mapToOpen !== null && (
        <ModalShell
          title={`Submit Map ${mapToOpen}`}
          onClose={() => setMapToOpen(null)}
          footer={
            <button type="button" onClick={submit} disabled={submitting} style={btn("#a777e4", true)}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Field label="Placement">
              <input style={input} type="number" value={placement} min={1} onChange={(e) => setPlacement(Number(e.target.value))} />
            </Field>

            <Field label="Total Kills">
              <div style={{ ...input, display: "flex", alignItems: "center", fontWeight: 950 }}>
                {totalKills}
              </div>
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

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Scoreboard Image</div>

              <textarea
                ref={pasteRef}
                placeholder="Click here and press Ctrl+V to paste a screenshot from your clipboard…"
                onPaste={handlePaste}
                style={{
                  width: "100%",
                  height: 80,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#10142a",
                  color: "white",
                  padding: "10px 12px",
                  boxSizing: "border-box",
                  outline: "none",
                  fontWeight: 800,
                  resize: "none",
                  marginBottom: 10,
                }}
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFileAndPreview(e.target.files?.[0] ?? null)}
                style={{ color: "white" }}
              />

              {imagePreview && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6, opacity: 0.85 }}>Preview</div>
                  <img
                    src={imagePreview}
                    alt="Scoreboard preview"
                    style={{
                      width: "100%",
                      maxHeight: 280,
                      objectFit: "contain",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "#0f1325",
                    }}
                  />

                  <div style={{ marginTop: 8 }}>
                    <button type="button" onClick={() => setFileAndPreview(null)} style={btn("#2a2f55")}>
                      Clear Image
                    </button>
                  </div>
                </div>
              )}

              <div style={{ opacity: 0.75, marginTop: 8, fontSize: 12 }}>
                You can either upload a file or paste a screenshot. Image is required on every submit/resubmit.
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default SubmitScoresPanel;
