import React, { useContext, useState } from 'react';
import { colorScheme } from '../config/Colors';
import { AuthContext } from '../contexts/AuthContext';
import addIcon from '../assets/add.svg';

function AddButton({ onOpenCouponForm, onOpenOnboarding }) {
  const { isVerified, isOnboarded } = useContext(AuthContext);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isVerified && isOnboarded) {
      if (onOpenCouponForm) {
        onOpenCouponForm(null); // Pass null to create a new coupon
      } else {
        console.error('onOpenCouponForm is not defined');
      }
    } else if (onOpenOnboarding) {
      onOpenOnboarding();
    } else {
      console.error('onOpenOnboarding is not defined');
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-20"
      style={{
        aspectRatio: '1',
        height: '10%',
        bottom: '6%',
        right: '6%',
        backgroundColor: isHovered
          ? colorScheme.primary.hover
          : colorScheme.primary.background,
        color: colorScheme.primary.text,
        transition: 'background-color 0.3s ease',
      }}
      aria-label="Make a Deal"
    >
      <img
        src={addIcon}
        alt="Add"
        className="h-1/2 w-1/2"
        style={{
          filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
          transition: 'filter 0.3s ease',
        }}
      />
    </button>
  );
}

export default AddButton;
