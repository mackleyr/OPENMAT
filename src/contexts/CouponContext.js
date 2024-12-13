// CouponContext.js
import React, { createContext, useState, useContext } from 'react';

const CouponContext = createContext();

export const CouponProvider = ({ children }) => {
  const initialCouponData = {
    id: null,
    title: '',
    background: require('../assets/background-1.svg').default,
    expires: null, 
    profileImage: null,
    isCustomBackground: false,
  };

  const [couponData, setCouponData] = useState(initialCouponData);

  const resetCouponData = () => {
    console.log("CouponContext.resetCouponData(): Resetting coupon data to initial.");
    setCouponData(initialCouponData);
  };

  console.log("CouponContext: Current couponData:", couponData);

  return (
    <CouponContext.Provider value={{ couponData, setCouponData, resetCouponData }}>
      {children}
    </CouponContext.Provider>
  );
};

export const useCoupon = () => useContext(CouponContext);
