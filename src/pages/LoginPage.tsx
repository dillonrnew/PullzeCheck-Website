import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import "../styles/AuthPages.css";

export default function LoginPage() {
  const navigate = useNavigate();

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      navigate("/"); // go back home
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Enter your email first, then click reset.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/login`,
        }
      );

      if (resetError) throw resetError;

      setMessage("Password reset email sent (check spam too).");
    } catch (err: any) {
      setError(err?.message ?? "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Sign in</div>
          <div className="auth-subtitle">Use your email + password</div>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="auth-alert auth-alertError">{error}</div>}
          {message && (
            <div className="auth-alert auth-alertOk">{message}</div>
          )}

          <button className="auth-btn auth-btnPrimary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            className="auth-btn auth-btnGhost"
            onClick={sendReset}
            disabled={loading}
          >
            Forgot password?
          </button>

          <div className="auth-footer">
            Don’t have an account? <Link to="/signup">Create one</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
