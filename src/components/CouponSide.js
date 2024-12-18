import React, { useEffect, useState } from 'react';
import { useCoupon } from '../contexts/CouponContext';
import defaultProfile from '../assets/profile.svg';
import logo from '../assets/logo.svg';
import Profile from './Profile';
import Text from '../config/Text';
import CouponShape from './CouponShape';
import GiftCardShape from './GiftCardShape';
import defaultBackground from '../assets/background.svg';

function CouponSide() {
  const { couponData } = useCoupon();
  const [couponSize, setCouponSize] = useState({ width: 0, height: 0 });

  const dealType = couponData?.dealType || 'coupon';

  useEffect(() => {
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

  let ShapeComponent = CouponShape;
  if (dealType === 'gift card') ShapeComponent = GiftCardShape;

  const profileImageSrc = couponData?.profilePhoto || defaultProfile;

  // Determine symbol and secondary label based on dealType
  let dealSymbol = '';
  let secondaryLabel = '';
  if (dealType === 'gift card') {
    dealSymbol = '$';
    secondaryLabel = 'gift card';
  } else if (dealType === 'coupon') {
    dealSymbol = '%';
    secondaryLabel = 'discount';
  }

  const shapeBackground = couponData.image ? couponData.image : defaultBackground;

  return (
    <div
      id="coupon-side"
      className="relative flex items-center justify-center w-full aspect-[5/3] transition-opacity z-20"
      style={{
        paddingBottom: '3%',
        paddingLeft: '3%',
        paddingRight: '3%',
      }}
    >
      <div className="relative w-full h-full rounded-lg">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 500 300"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 object-cover"
          style={{
            filter: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.4))',
          }}
        >
          <defs>
            {shapeBackground && (
              <pattern
                id="couponBackground"
                patternUnits="userSpaceOnUse"
                width="500"
                height="300"
              >
                <image
                  href={shapeBackground}
                  x="0"
                  y="0"
                  width="500"
                  height="300"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            )}
            <clipPath id="couponClip">
              <ShapeComponent fill={shapeBackground ? "url(#couponBackground)" : "#fff"} />
            </clipPath>
            <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Shape with background */}
          <ShapeComponent fill={shapeBackground ? "url(#couponBackground)" : "#fff"} />

          {/* Top and Bottom Gradients clipped to shape */}
          <g clipPath="url(#couponClip)">
            <rect
              x="0"
              y="0"
              width="500"
              height="60"
              fill="url(#topGrad)"
            />
            <rect
              x="0"
              y="240"
              width="500"
              height="60"
              fill="url(#bottomGrad)"
            />
          </g>
        </svg>

        {/* Profile and Name (top-left) */}
        <div
          className="absolute top-[7%] left-[3%] z-20 flex items-center"
          style={{ fontSize: dynamicSize * 0.6 }}
        >
          <Profile size={dynamicSize} src={profileImageSrc} score={0} />
          {couponData?.name && (
            <div className="ml-2">
              <Text type="medium" role="white">{couponData.name}</Text>
            </div>
          )}
        </div>

        {/* Value + Secondary Label (top-right) */}
        {couponData?.value && (
          <div
            className="absolute top-[7%] right-[3%] z-20 px-4 py-1 rounded-lg flex flex-col items-center"
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
              textAlign: 'center',
              wordWrap: 'break-word',
            }}
          >
            <Text type="large" role="white">
              {dealSymbol === '$' 
                ? `${dealSymbol}${couponData.value}` 
                : `${couponData.value}${dealSymbol}`
              }
            </Text>
            <Text type="small" role="white" className="mt-1">
              {secondaryLabel}
            </Text>
          </div>
        )}

        {/* Title (center) */}
        {couponData?.title && (
          <div
            className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center z-20"
          >
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

        {/* Logo (bottom-right) */}
        <img
          src={logo}
          alt="Logo"
          className="absolute bottom-[7%] right-[3%] z-20"
          style={{
            width: dynamicSize * 0.8,
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
}

export default CouponSide;
