import React, { useMemo, useState } from "react";
import "../styles/LeftSidebar.css";

type NavItem = {
  id: string;
  label: string;
  badge?: string | number;
  adminOnly?: boolean; // ✅ NEW
};

type LeftSidebarProps = {
  brand?: string;
  subtitle?: string;
  items?: NavItem[];
  activeItemId?: string;
  onSelect?: (item: NavItem) => void;
  isAdmin?: boolean; // ✅ NEW
};

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  brand = "PULLZECHECK",
  subtitle = "HomePage",
  items,
  activeItemId,
  onSelect,
  isAdmin = false, // ✅ default
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const defaultItems: NavItem[] = useMemo(
    () => [
      { id: "tournaments", label: "Tournaments" },
      { id: "my-teams", label: "My Teams" },
      { id: "my-tournaments", label: "My Tournaments" },

      // 🔐 admin-only
      { id: "admin-submissions", label: "Admin Submissions", adminOnly: true },
      { id: "admin-team-approvals", label: "Team Approvals", adminOnly: true },
      { id: "admin-create-tourney", label: "Admin Create Tourney", adminOnly: true },
    ],
    []
  );

  const navItemsRaw = items?.length ? items : defaultItems;

  // ✅ Filter admin items if not admin
  const navItems = useMemo(() => {
    if (isAdmin) return navItemsRaw;
    return navItemsRaw.filter((i) => !i.adminOnly);
  }, [isAdmin, navItemsRaw]);

  const handleSelect = (item: NavItem) => {
    onSelect?.(item);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile top trigger */}
      <div className="ls-mobileTop">
        <button
          className="ls-iconBtn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
        >
          ☰
        </button>
        <div className="ls-mobileBrand">
          <div className="ls-brandText">{brand}</div>
          <div className="ls-subtitle">{subtitle}</div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`ls-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={[
          "ls",
          collapsed ? "collapsed" : "",
          mobileOpen ? "mobileOpen" : "",
        ].join(" ")}
      >
        <div className="ls-top">
          <div className="ls-brand">
            <div className="ls-brandText">{brand}</div>
            <div className="ls-subtitle">{subtitle}</div>
          </div>

          <div className="ls-topBtns">
            <button
              className="ls-iconBtn"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "»" : "«"}
            </button>

            <button
              className="ls-iconBtn ls-closeMobile"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="ls-scroll">
          <div className="ls-items">
            {navItems.map((item) => {
              const isActive = item.id === activeItemId;
              return (
                <button
                  key={item.id}
                  className={`ls-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSelect(item)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="ls-itemLeft">
                    <span className="ls-dot" aria-hidden="true" />
                    <span className="ls-label">{item.label}</span>
                  </span>

                  {item.badge !== undefined && (
                    <span className="ls-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default LeftSidebar;
