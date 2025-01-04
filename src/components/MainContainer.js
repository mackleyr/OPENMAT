// src/components/MainContainer.js
import React from "react";

function MainContainer({ children }) {
  return (
    <div
      className="relative flex flex-col bg-white"
      style={{
        // This container is sized like a phone in the middle,
        // but we rely on the body to remain unscrollable.
        // So the phone never "moves" on iOS bounce.
        position: "absolute", 
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)", 

        maxWidth: "calc(80vh / 1.618)",  // Golden ratio phone shape
        maxHeight: "80vh",
        aspectRatio: "1 / 1.618",
        
        width: "100%",   // In case we shrink narrower than maxWidth
        height: "100%",  // In case we shrink shorter than maxHeight

        borderRadius: "clamp(30px, 3vw, 40px)",
        border: "clamp(20px, 5vw, 40px) solid #1a1a1a",
        boxShadow: `
          0 0 20px rgba(255, 255, 255, 0.5),
          0 0 40px rgba(192, 192, 192, 0.7),
          0 0 60px rgba(255, 255, 255, 0.4),
          0 0 80px rgba(0, 0, 0, 0.5)
        `,
        outline: "clamp(4px, 1vw, 8px) solid rgba(192,192,192,0.8)",
        outlineOffset: "-clamp(4px, 1vw, 8px)",
        
        overflow: "hidden", // Keep the phone border shape
        backgroundColor: "#fff"
      }}
    >
      {children}
    </div>
  );
}

export default MainContainer;
