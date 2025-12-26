// src/components/tourneyDetails/components/ModalShell.tsx
import React from "react";
import { btn } from "../ui";

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

const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, onClose, children, footer }) => {
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
          <button style={btn("#2a2f55")} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div style={{ height: 12 }} />
        {children}
        <div style={{ height: 14 }} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</div>
      </div>
    </div>
  );
};

export default ModalShell;
