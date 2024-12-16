import React, { useState, useContext } from "react";
import MainContainer from "./components/MainContainer";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Coupon from "./components/Coupon";
import Buttons from "./components/Buttons";
import ActivityLog from "./components/ActivityLog";
import AddButton from "./components/AddButton";
import OnboardingForm from "./components/OnboardingForm";
import CouponForm from "./components/CouponForm";
import ProfileSheet from "./components/ProfileSheet";
import { AuthContext } from "./contexts/AuthContext";
import "./index.css";

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [couponFormData, setCouponFormData] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);
  const { isVerified, isOnboarded, fetchSession } = useContext(AuthContext);

  const handleOpenOnboarding = () => {
    // User tapped coupon but is not onboarded
    setPendingAction("openCouponForm");
    setShowOnboarding(true);
  };

  const handleOpenCouponForm = (couponData = null) => {
    if (!isVerified || !isOnboarded) {
      // Not onboarded yet, show onboarding first
      setPendingAction("openCouponForm");
      setCouponFormData(couponData);
      setShowOnboarding(true);
    } else {
      // User is onboarded, open the coupon form directly
      setCouponFormData(couponData);
      setCurrentDealId(couponData?.id || null);
      setShowCouponForm(true);
    }
  };

  const handleProfileClick = () => {
    if (!isVerified || !isOnboarded) {
      setPendingAction("openProfileSheet");
      setShowOnboarding(true);
    } else {
      setShowProfileSheet(true);
    }
  };

  const handleOnboardingComplete = async () => {
    console.log("Onboarding completed. Refreshing session...");
    try {
      await fetchSession();
      setShowOnboarding(false);

      // If after onboarding the user should do something, do it now
      if (isOnboarded) {
        if (pendingAction === "openCouponForm") {
          setShowCouponForm(true);
        } else if (pendingAction === "openProfileSheet") {
          setShowProfileSheet(true);
        }
      } else {
        console.warn("User not fully onboarded even after attempt. Prompt again or guide user.");
      }

      setPendingAction(null);
    } catch (error) {
      console.error("Error completing onboarding:", error.message);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        <Header onProfileClick={handleProfileClick} />
        <div className="flex-1 flex flex-col items-center justify-start w-full">
          <Coupon
            onOpenCouponForm={handleOpenCouponForm}
            onOpenOnboarding={handleOpenOnboarding}
          />
          <div className="w-full max-w-[768px]">
            <Buttons />
            <div className="py-[4%]"></div>
            <ActivityLog
              dealId={currentDealId}
              onProfileClick={handleProfileClick}
            />
          </div>
        </div>
        <Footer />
        <AddButton
          onOpenCouponForm={handleOpenCouponForm}
          onOpenOnboarding={handleOpenOnboarding}
        />

        {showOnboarding && (
          <div className="absolute inset-0 flex justify-center items-end z-50 bg-black bg-opacity-50">
            <div className="absolute inset-0 bg-white rounded-t-lg">
              <OnboardingForm onComplete={handleOnboardingComplete} />
            </div>
          </div>
        )}

        {showCouponForm && (
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
