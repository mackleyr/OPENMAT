import React, { useState } from 'react';
import { colorScheme } from '../config/Colors';
import addIcon from '../assets/add.svg';

function AddButton({ onOpenCouponForm }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onOpenCouponForm) {
      onOpenCouponForm(null); // Pass null to create a new coupon
    } else {
      console.error('onOpenCouponForm is not defined');
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute rounded-full shadow-lg flex items-center justify-center hover:scale-110 hover:brightness-150 transition-transform z-20"
      style={{
        aspectRatio: '1',
        height: '10%',
        bottom: '6%',
        right: '6%',
        backgroundColor: isHovered 
          ? colorScheme.primary.background   // minorColor
          : colorScheme.primary.background, // mainColor
        color: colorScheme.primary.text,
        transition: 'background-color 0.3s ease',
        cursor: 'pointer',
      }}
      aria-label="Make a Deal"
    >
      <img
        src={addIcon}
        alt="Add"
        className="h-1/2 w-1/2"
        style={{
          // No additional filter needed here
          transition: 'none',
        }}
      />
    </button>
  );
}

export default AddButton;
