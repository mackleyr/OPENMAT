// src/components/MainContainer.js
import React from "react";

function MainContainer({ children }) {
  return (
    <div
      className="relative flex flex-col"
      style={{
        // Center it in the page
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        
        // The "phone" shape
        maxWidth: "calc(80vh / 1.618)",  // Golden ratio shape
        maxHeight: "80vh",
        aspectRatio: "1 / 1.618",
        
        width: "100%",
        height: "100%",

        // A decorative border, shadows, etc.
        borderRadius: "clamp(30px,3vw,40px)",
        border: "clamp(20px,5vw,40px) solid #1a1a1a",
        boxShadow: `
          0 0 20px rgba(255, 255, 255, 0.5),
          0 0 40px rgba(192, 192, 192, 0.7),
          0 0 60px rgba(255, 255, 255, 0.4),
          0 0 80px rgba(0, 0, 0, 0.5)
        `,
        outline: "clamp(4px,1vw,8px) solid rgba(192,192,192,0.8)",
        outlineOffset: "-clamp(4px,1vw,8px)",

        // So content can’t exceed phone shape
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      {children}
    </div>
  );
}

export default MainContainer;
