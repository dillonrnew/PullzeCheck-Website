// src/components/tourneyDetails/ui.tsx
import React from "react";

export const pill = (bg: string): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 999,
  background: bg,
  fontSize: 13,
  fontWeight: 900,
});

export function btn(bg: string, darkText = false): React.CSSProperties {
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

export const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "#10142a",
  color: "white",
  outline: "none",
  fontWeight: 800,
  boxSizing: "border-box",
};

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div style={{ marginBottom: 28 }}>
    <h2 style={{ marginBottom: 12, fontSize: 20, fontWeight: 900 }}>{title}</h2>
    <div>{children}</div>
  </div>
);

export const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", marginBottom: 10 }}>
    <div style={{ opacity: 0.75 }}>{label}</div>
    <div style={{ fontWeight: 800 }}>{value}</div>
  </div>
);

export const Group: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

export const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 12,
    }}
  >
    {children}
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

export function tabStyle(activeTab: string, key: string): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: key === activeTab ? "#a777e4" : "#14182d",
    color: key === activeTab ? "#000" : "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}
