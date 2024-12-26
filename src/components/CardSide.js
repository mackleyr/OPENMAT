// src/components/CardSide.jsx

import React, { useEffect, useRef, useState } from 'react';
import Profile from './Profile';            // or wherever your <Profile> is
import Text from '../config/Text';          // <--- points to the Text.js above
import defaultProfile from '../assets/profile.svg';
import defaultBackground from '../assets/background.svg';
import logo from '../assets/logo.svg';      // or your own logo path

function CardSide({ cardData }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Monitor the container size for dynamic scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Scale factor for responsive text sizing
  const baseWidth = 400;
  const scale = dimensions.width ? dimensions.width / baseWidth : 1;

  // Fallback images
  const profileImageSrc = cardData?.profilePhoto || defaultProfile;
  const backgroundSrc =
    cardData?.dealImage || cardData?.image || defaultBackground;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[5/3] overflow-hidden"
      style={{
        borderRadius: '12px',
        padding: '5%',
        boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.4)',
        background: `url(${backgroundSrc}) center/cover no-repeat`,
      }}
    >
      {/* TOP GRADIENT OVERLAY */}
      <div
        className="absolute top-0 left-0 w-full"
        style={{
          height: '25%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* BOTTOM GRADIENT OVERLAY */}
      <div
        className="absolute bottom-0 left-0 w-full"
        style={{
          height: '25%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* PROFILE + NAME (top-left) */}
      <div
        className="absolute flex items-center"
        style={{
          top: '5%',
          left: '5%',
          fontSize: `${1.3 * scale}rem`,
          zIndex: 2,
        }}
      >
        <Profile size={50 * scale} src={profileImageSrc} />
        {cardData?.name && (
          <div className="ml-2">
            <Text
              type="large"
              role="white"
              style={{ fontSize: `${0.9 * scale}rem` }}
            >
              {cardData.name}
            </Text>
          </div>
        )}
      </div>

      {/* VALUE (top-right) */}
      {cardData?.dealValue && (
        <div
          className="absolute flex flex-col items-center"
          style={{
            top: '5%',
            right: '5%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '4px 8px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: `${1.3 * scale}rem`,
            zIndex: 2,
          }}
        >
          <Text
            type="large"
            role="white"
            style={{ fontSize: `${1.3 * scale}rem` }}
          >
            ${cardData.dealValue}
          </Text>
          <Text
            type="large"
            role="white"
            className="mt-1"
            style={{ fontSize: `${0.8 * scale}rem` }}
          >
            Gift Card
          </Text>
        </div>
      )}

      {/* TITLE (center) */}
      {cardData?.dealTitle && (
        <div
          className="absolute flex flex-col items-center text-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 12px',
            borderRadius: '12px',
            maxWidth: '75%',
            wordWrap: 'break-word',
            fontSize: `${scale}rem`,
            zIndex: 2,
          }}
        >
          <Text
            type="large"
            role="white"
            style={{
              fontSize: `${1.4 * scale}rem`,
              fontWeight: 'bold',
            }}
          >
            {cardData.dealTitle}
          </Text>
        </div>
      )}

      {/* LOGO (bottom-right) */}
      <img
        src={logo}
        alt="Logo"
        className="absolute"
        style={{
          bottom: '5%',
          right: '5%',
          width: `${36 * scale}px`,
          height: 'auto',
          objectFit: 'contain',
          zIndex: 2,
        }}
      />
    </div>
  );
}

export default CardSide;
