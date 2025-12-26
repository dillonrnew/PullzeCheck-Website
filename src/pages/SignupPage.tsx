import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import "../styles/AuthPages.css";

export default function SignupPage() {
  const navigate = useNavigate();

  const [gamertag, setGamertag] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
        const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
            data: {
            gamertag: gamertag.trim(), // auth metadata
            },
        },
        });

        if (signUpError) throw signUpError;

        const user = data.user;
        if (!user) throw new Error("User not created");

        // 🔹 Ensure display name exists in profiles table
        const { error: profileError } = await supabase
        .from("profiles")
        .insert({
            id: user.id,
            gamertag: gamertag.trim(),
        });

        if (profileError) throw profileError;

        // Email confirmation ON
        if (!user.email_confirmed_at) {
        setMessage(
            "Account created! Check your email to confirm, then sign in."
        );
        return;
        }

        // Email confirmation OFF → logged in
        navigate("/");
    } catch (err: any) {
        setError(err?.message ?? "Failed to create account.");
    } finally {
        setLoading(false);
    }
    };



  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Create account</div>
          <div className="auth-subtitle">Email + password (local)</div>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label">
            Gamertag
            <input
              className="auth-input"
              type="text"
              value={gamertag}
              onChange={(e) => setGamertag(e.target.value)}
              placeholder="PullzeCheck"
              maxLength={24}
              required
            />
          </label>

          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </label>

          {error && <div className="auth-alert auth-alertError">{error}</div>}
          {message && (
            <div className="auth-alert auth-alertOk">{message}</div>
          )}

          <button className="auth-btn auth-btnPrimary" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
