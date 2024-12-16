// CouponSide.js

import React, { useContext, useEffect, useState } from 'react';
import { useCoupon } from '../contexts/CouponContext';
import { AuthContext } from '../contexts/AuthContext';
import defaultProfile from '../assets/profile.svg';
import Profile from './Profile';
import Text from '../config/Text';
import background1 from '../assets/background-1.svg';
import background2 from '../assets/background-2.svg';

function CouponSide() {
  const { couponData } = useCoupon();
  const { profileData } = useContext(AuthContext);

  // State for hover background
  const [hoverBackground, setHoverBackground] = useState(background1);

  const isProfileComplete =
    profileData?.phoneNumber && profileData?.name && profileData?.profileImage;

  const [remainingTime, setRemainingTime] = useState(null);
  const [countdownLabel, setCountdownLabel] = useState('');
  const [couponSize, setCouponSize] = useState({ width: 0, height: 0 });

  const radius = 16; // Circle radius
  const circumference = 2 * Math.PI * radius; // Full circle circumference
  const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);

  useEffect(() => {
    // Update remaining time for expiration
    const updateRemainingTime = () => {
      if (!couponData.expires) return;

      const now = new Date();
      const expiration = new Date(now.getTime() + couponData.expires * 3600000);
      const diff = expiration - now;

      if (diff <= 0) {
        setRemainingTime(0);
        setCountdownLabel('Expired');
        setStrokeDashoffset(circumference);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const progress = Math.max(diff / (couponData.expires * 3600000), 0);

      setStrokeDashoffset(circumference * (1 - progress));
      if (hours < 24) {
        setRemainingTime(hours);
        setCountdownLabel('h');
      } else {
        const days = Math.floor(hours / 24);
        setRemainingTime(days);
        setCountdownLabel('d');
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [couponData.expires, circumference]);

  useEffect(() => {
    // Resize observer for dynamic sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setCouponSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    const couponElement = document.getElementById('coupon-side');
    if (couponElement) resizeObserver.observe(couponElement);

    return () => {
      if (couponElement) resizeObserver.unobserve(couponElement);
    };
  }, []);

  const dynamicSize = couponSize.width * 0.10;

  // Handle background change for hover and custom upload
  useEffect(() => {
    if (couponData.isCustomBackground) {
      setHoverBackground(couponData.background);
    } else {
      setHoverBackground(background1);
    }
  }, [couponData.isCustomBackground, couponData.background]);

  return (
    <div
      id="coupon-side"
      className="relative flex items-center justify-center w-full aspect-[5/3] transition-opacity"
      style={{
        paddingBottom: '3%',
        paddingLeft: '3%',
        paddingRight: '3%',
      }}
      onMouseEnter={() => {
        if (!couponData.isCustomBackground) setHoverBackground(background2);
      }}
      onMouseLeave={() => {
        if (!couponData.isCustomBackground) setHoverBackground(background1);
      }}
    >
      <div className="relative w-full h-full rounded-lg">
        {/* SVG Background */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 500 300"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 object-cover"
          style={{
            filter: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.4))', // Ensure consistent shadow
          }}
        >
          <defs>
            <pattern
              id="couponBackground"
              patternUnits="userSpaceOnUse"
              width="500"
              height="300"
            >
              <image
                href={hoverBackground}
                x="0"
                y="0"
                width="500"
                height="300"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          </defs>
          <path
            d="M476.83 0H23.633C10.8368 0 0.463392 9.73293 0.463392 21.7391L0 96.5217C31.4787 96.5217 56.9972 120.465 56.9972 150C56.9972 179.535 31.4787 203.478 0 203.478L0.463392 278.261C0.463392 290.267 10.8368 300 23.633 300H476.83C489.627 300 500 290.267 500 278.261L499.537 203.478C468.058 203.478 442.539 179.535 442.539 150C442.539 120.465 468.058 96.5217 499.537 96.5217L500 21.7391C500 9.73294 489.627 0 476.83 0Z"
            fill="url(#couponBackground)"
          />
        </svg>

        {/* Profile Section with Score */}
        <div
          className="absolute top-[7%] left-[3%] z-10 flex items-center"
          style={{ fontSize: dynamicSize * 0.6 }}
        >
          <Profile
            size={dynamicSize}
            src={profileData?.profileImage || defaultProfile}
            score={profileData?.score || 0}
          />
          {isProfileComplete && (
            <span className="text-white font-semibold px-[4%]">{profileData.name}</span>
          )}
        </div>

        {/* Logo */}
        {couponData.logo && (
          <img
            src={couponData.logo}
            alt="Logo"
            className="absolute top-[7%] right-[3%] z-50 object-contain"
            style={{
              width: dynamicSize,
              height: dynamicSize,
            }}
          />
        )}

        {/* Title */}
        {couponData.title && (
          <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-center">
            <div
              className="z-20 px-4 py-1 rounded-lg"
              style={{
                maxWidth: '75%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
                wordWrap: 'break-word',
              }}
            >
              <Text type="large" role="white">
                {couponData.title}
              </Text>
            </div>
          </div>
        )}

        {/* Expiration Circle */}
        {remainingTime !== null && (
          <div
            className="absolute bottom-[5%] right-[3%] z-20 rounded-full"
            style={{
              width: dynamicSize,
              height: dynamicSize,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 60 60"
              style={{ backgroundColor: 'transparent' }}
            >
              <circle
                cx="30"
                cy="30"
                r="27"
                stroke="#e2e8f0"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="30"
                cy="30"
                r="27"
                stroke="#ffffff"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.5s ease',
                }}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dy=".35em"
                fontSize={dynamicSize * 0.5}
                fontWeight="bold"
                fill="#ffffff"
              >
                {remainingTime}
                {countdownLabel}
              </text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default CouponSide;