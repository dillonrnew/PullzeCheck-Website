import React, { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type Mode = "resurgence" | "br";
type Status = "upcoming" | "ongoing" | "completed";

type FormState = {
  tourneyName: string;
  sheetLink: string;
  status: Status;
  teamsTotal: string;     // keep as string for inputs; convert on submit
  prizePool: string;      // same
  startTime: string;      // datetime-local string
  image: string;
  mode: Mode;
};

function toBigintOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  // bigint column: we send as number; PostgREST will coerce
  return Math.floor(n);
}

function toIsoOrNull(datetimeLocal: string): string | null {
  const trimmed = datetimeLocal.trim();
  if (!trimmed) return null;
  // datetime-local is like "2025-12-26T15:30"
  // Convert to ISO string in user's local time
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const CreateTournamentForm: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    tourneyName: "",
    sheetLink: "",
    status: "ongoing",
    teamsTotal: "",
    prizePool: "",
    startTime: "",
    image: "",
    mode: "resurgence",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return form.tourneyName.trim().length > 0 && !submitting;
  }, [form.tourneyName, submitting]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const TourneyName = form.tourneyName.trim();
    if (!TourneyName) {
      setErrorMsg('Tourney Name is required.');
      return;
    }

    const payload = {
      'Tourney Name': TourneyName,
      'Sheet Link': form.sheetLink.trim() || null,
      'Status': form.status, // must be upcoming|ongoing|completed
      'Teams Total': toBigintOrNull(form.teamsTotal),
      'Prize Pool': toBigintOrNull(form.prizePool),
      'Start Time': toIsoOrNull(form.startTime),
      'Image': form.image.trim() || null,
      'Mode': form.mode,     // must be resurgence|br
      // 'Teams Assigned' omitted -> defaults to 0
      // 'UUID' omitted -> default gen_random_uuid()
    };

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .insert(payload)
        .select('"UUID","Tourney Name"')
        .single();

      if (error) throw error;

      setSuccessMsg(`Created tournament: ${data?.["Tourney Name"]} (${data?.UUID})`);
      setForm({
        tourneyName: "",
        sheetLink: "",
        status: "ongoing",
        teamsTotal: "",
        prizePool: "",
        startTime: "",
        image: "",
        mode: "resurgence",
      });
    } catch (err: any) {
      // Common: RLS blocks inserts -> code 42501
      const msg =
        err?.message ||
        err?.error_description ||
        "Failed to create tournament.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Tournament</h2>

        {errorMsg && <div style={{ ...styles.alert, ...styles.alertErr }}>{errorMsg}</div>}
        {successMsg && <div style={{ ...styles.alert, ...styles.alertOk }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Tourney Name *
            <input
              style={styles.input}
              value={form.tourneyName}
              onChange={(e) => update("tourneyName", e.target.value)}
              placeholder="e.g. WSOW Weekly #3"
              required
            />
          </label>

          <label style={styles.label}>
            Sheet Link
            <input
              style={styles.input}
              value={form.sheetLink}
              onChange={(e) => update("sheetLink", e.target.value)}
              placeholder="Google Sheet URL (optional)"
            />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>
              Status
              <select
                style={styles.input}
                value={form.status}
                onChange={(e) => update("status", e.target.value as Status)}
              >
                <option value="upcoming">upcoming</option>
                <option value="ongoing">ongoing</option>
                <option value="completed">completed</option>
              </select>
            </label>

            <label style={styles.label}>
              Mode
              <select
                style={styles.input}
                value={form.mode}
                onChange={(e) => update("mode", e.target.value as Mode)}
              >
                <option value="resurgence">resurgence</option>
                <option value="br">br</option>
              </select>
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>
              Teams Total
              <input
                style={styles.input}
                value={form.teamsTotal}
                onChange={(e) => update("teamsTotal", e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 50"
              />
            </label>

            <label style={styles.label}>
              Prize Pool
              <input
                style={styles.input}
                value={form.prizePool}
                onChange={(e) => update("prizePool", e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 2000"
              />
            </label>
          </div>

          <label style={styles.label}>
            Start Time
            <input
              style={styles.input}
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => update("startTime", e.target.value)}
            />
            <div style={styles.hint}>
              Stored as timestamptz (submitted as ISO).
            </div>
          </label>

          <label style={styles.label}>
            Image
            <input
              style={styles.input}
              value={form.image}
              onChange={(e) => update("image", e.target.value)}
              placeholder="Image URL (optional)"
            />
          </label>

          <button type="submit" style={{ ...styles.btn, opacity: canSubmit ? 1 : 0.6 }} disabled={!canSubmit}>
            {submitting ? "Creating..." : "Create Tournament"}
          </button>

          <div style={styles.smallNote}>
            “Teams Assigned” defaults to 0 and UUID auto-generates.
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentForm;

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    width: "min(720px, 100%)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(20, 24, 45, 0.9)",
    padding: 18,
    boxSizing: "border-box",
  },
  title: { margin: "0 0 14px 0" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14 },
  input: {
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    padding: "0 12px",
    background: "rgba(0,0,0,0.22)",
    color: "white",
    outline: "none",
  },
  hint: { fontSize: 12, opacity: 0.75, marginTop: 4 },
  btn: {
    height: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(167, 119, 228, 0.95)",
    color: "black",
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 6,
  },
  alert: {
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    marginBottom: 10,
  },
  alertErr: {
    background: "rgba(255, 70, 70, 0.18)",
    border: "1px solid rgba(255, 70, 70, 0.35)",
  },
  alertOk: {
    background: "rgba(40, 210, 120, 0.14)",
    border: "1px solid rgba(40, 210, 120, 0.28)",
  },
  smallNote: { fontSize: 12, opacity: 0.8, marginTop: 6 },
};
