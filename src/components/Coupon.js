import React, { useContext } from 'react';
import CouponSide from './CouponSide';
import { AuthContext } from '../contexts/AuthContext';
import { useCoupon } from '../contexts/CouponContext';

function Coupon({ onOpenCouponForm, onOpenOnboarding }) {
  const { isVerified, isOnboarded } = useContext(AuthContext);
  const { couponData } = useCoupon();

  const handleClick = () => {
    if (isVerified && isOnboarded) {
      if (onOpenCouponForm) {
        onOpenCouponForm(couponData); // Pass couponData for editing
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
    <div
      onClick={handleClick}
      className="relative flex flex-col justify-between items-center w-full h-auto bg-white cursor-pointer rounded-lg"
      style={{
        padding: '5%',
        boxSizing: 'border-box',
      }}
    >
      <CouponSide />
    </div>
  );
}

export default Coupon;
