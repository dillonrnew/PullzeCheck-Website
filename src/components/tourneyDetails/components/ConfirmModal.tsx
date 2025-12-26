// src/components/tourneyDetails/components/ConfirmModal.tsx
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
  width: "min(560px, 92vw)",
  background: "#0f1325",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 14,
  padding: 16,
  color: "white",
};

const ConfirmModal: React.FC<{
  title: string;
  body: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, body, confirmText, cancelText, onConfirm, onCancel }) => {
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
        <div style={{ height: 10 }} />
        <div style={{ opacity: 0.9, lineHeight: 1.4 }}>{body}</div>

        <div style={{ height: 16 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={btn("#2a2f55")} onClick={onCancel} type="button">
            {cancelText}
          </button>
          <button style={btn("#a777e4", true)} onClick={onConfirm} type="button">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
