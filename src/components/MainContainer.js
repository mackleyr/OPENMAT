// src/components/Header.js

import React from 'react';

function MainContainer({ children }) {
  return (
    <div
      className="relative flex flex-col bg-white overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: 'calc(80vh / 1.618)', // Golden ratio
        maxHeight: '80vh',
        aspectRatio: '1 / 1.618',
        margin: 'auto',
        borderRadius: 'clamp(30px, 3vw, 40px)', // Clamped border-radius
        border: 'clamp(20px, 5vw, 40px) solid #1a1a1a', // Dynamic border
        boxShadow: `
          0 0 20px rgba(255, 255, 255, 0.5), /* Inner white glow */
          0 0 40px rgba(192, 192, 192, 0.7), /* Silver shimmer */
          0 0 60px rgba(255, 255, 255, 0.4), /* Outer white glow */
          0 0 80px rgba(0, 0, 0, 0.5)        /* Shadow glow */
        `,
        outline: 'clamp(4px, 1vw, 8px) solid rgba(192,192,192,0.8)', // Silver stroke
        outlineOffset: '-clamp(4px, 1vw, 8px)', // Overlap border slightly
      }}
    >
      {children}
    </div>
  );
}

export default MainContainer;
