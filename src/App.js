import React, { useState } from "react";
import MainContainer from "./components/MainContainer";
import Footer from "./components/Footer";
import Coupon from "./components/Coupon";
import Buttons from "./components/Buttons";
import ActivityLog from "./components/ActivityLog";
import AddButton from "./components/AddButton";
import CouponForm from "./components/CouponForm";
import ProfileSheet from "./components/ProfileSheet";
import OnboardingForm from "./components/OnboardingForm"; // <-- Import the new form
import "./index.css";

function App() {
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  const [couponFormData, setCouponFormData] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  const handleOpenCouponForm = (couponData = null) => {
    setCouponFormData(couponData);
    setCurrentDealId(couponData?.id || null);
    if (!userOnboarded) {
      // User not onboarded yet, show the OnboardingForm first
      setShowOnboardingForm(true);
    } else {
      // User is onboarded, proceed directly to CouponForm
      setShowCouponForm(true);
    }
  };

  const handleProfileClick = () => {
    setShowProfileSheet(true);
  };

  const handleOnboardingComplete = (userData) => {
    // userData = { name, phone, profilePhoto }
    // Here you can store userData in local/session storage if needed.
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowCouponForm(true); // now show the coupon form after onboarding
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <Coupon onOpenCouponForm={handleOpenCouponForm} />
          <div className="w-full max-w-[768px] py-[2%]">
            <Buttons />
            <div className="py-[4%]" />
            <ActivityLog
              dealId={currentDealId}
              onProfileClick={handleProfileClick}
            />
          </div>
        </div>
        <Footer />
        <AddButton onOpenCouponForm={handleOpenCouponForm} />

        {showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <OnboardingForm onComplete={handleOnboardingComplete} />
          </div>
        )}

        {showCouponForm && !showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <CouponForm
              onClose={() => setShowCouponForm(false)}
              onSave={(savedCoupon) => {
                setCurrentDealId(savedCoupon.id);
                setShowCouponForm(false);
              }}
              initialData={couponFormData}
            />
          </div>
        )}

        {showProfileSheet && (
          <div className="absolute inset-0 z-50">
            <ProfileSheet onClose={() => setShowProfileSheet(false)} />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default App;
