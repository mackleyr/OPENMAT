// src/components/Fab.js
import React from "react";

export default function Fab({ onClick, title = "Create" }) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      className="fixed bottom-5 right-5 z-20 rounded-full shadow-lg border"
      style={{
        height: 56,
        width: 56,
        background: "#000",
        color: "#fff",
        borderColor: "rgba(0,0,0,0.1)",
        transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
    >
      <span style={{ fontSize: 28, lineHeight: "56px" }}>＋</span>
    </button>
  );
}
