// src/components/Footer.jsx
import React from "react";
import logo2 from "../assets/logo-2.svg";

// Still exporting FOOTER_PX in case anything references the height.
export const FOOTER_PX = 48;

function Footer() {
  return (
    <div
      className="flex w-full items-center px-4"
      style={{
        height: FOOTER_PX,
        flexShrink: 0,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "#fff",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Logo only, top-left */}
      <img
        src={logo2}
        alt="OPENMAT"
        className="h-4 w-auto object-contain"
        aria-label="OPENMAT"
      />
    </div>
  );
}

export default Footer;
