import React from 'react';
import CouponSide from './CouponSide';
import { useCoupon } from '../contexts/CouponContext';

function Coupon({ onOpenCouponForm }) {
  const { couponData } = useCoupon();

  const handleClick = () => {
    if (onOpenCouponForm) {
      onOpenCouponForm(couponData); // Pass couponData for editing
    } else {
      console.error('onOpenCouponForm is not defined');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative flex flex-col justify-between items-center w-full h-auto bg-white cursor-pointer rounded-lg"
      style={{
        padding: '%',
        boxSizing: 'border-box',
      }}
    >
      <CouponSide />
    </div>
  );
}

export default Coupon;
