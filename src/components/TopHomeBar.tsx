import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "../styles/TopHomeBar.css";

type UserView = {
  email?: string;
  displayName?: string;
};

const TopHomeBar: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userView, setUserView] = useState<UserView | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    const hydrate = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!alive) return;

      if (!user) {
        setUserView(null);
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("gamertag")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      const metaName =
        (user.user_metadata?.gamertag as string | undefined) ||
        (user.user_metadata?.display_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined);

      const displayName = profileData?.gamertag?.trim() || metaName?.trim();

      setUserView({
        email: user.email ?? undefined,
        displayName: displayName || undefined,
      });

      setLoading(false);
    };

    hydrate();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      hydrate();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Close dropdown on outside click + ESC
  useEffect(() => {
    if (!menuOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const signOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");

  // Placeholder options (wire these later)
  const goToAccount = () => {
    setMenuOpen(false);
    navigate("/account"); // create later
  };

  const goToSettings = () => {
    setMenuOpen(false);
    navigate("/settings"); // create later
  };

  return (
    <header className="thb">
      <div />
      <div className="thb-right">
        {loading ? (
          <div className="thb-skeleton">Loading…</div>
        ) : userView ? (
          <div className="thb-menuWrap" ref={menuRef}>
            <button
            type="button"
            className="thb-userBtn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            >
            <div className="thb-avatar">
                {(userView.displayName?.[0] ||
                userView.email?.[0] ||
                "U"
                ).toUpperCase()}
            </div>

            <div className="thb-userMeta">
                <div className="thb-userName">
                {userView.displayName ?? "User"}
                </div>
            </div>

            <span className="thb-caret" aria-hidden="true">
                ▾
            </span>
            </button>


            {menuOpen && (
              <div className="thb-dropdown" role="menu">
                <button className="thb-ddItem" onClick={goToAccount} role="menuitem">
                  Account
                </button>
                <button className="thb-ddItem" onClick={goToSettings} role="menuitem">
                  Settings
                </button>
                <div className="thb-ddDivider" />
                <button className="thb-ddItem thb-ddDanger" onClick={signOut} role="menuitem">
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="thb-btn thb-btnPrimary" onClick={goToLogin}>
              Sign in
            </button>
            <button className="thb-btn thb-btnGhost" onClick={goToSignup}>
              Create account
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default TopHomeBar;
