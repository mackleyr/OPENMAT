// OnboardingContext.js
import React, { createContext, useState, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const OnboardingContext = createContext();

const OnboardingProvider = ({ children }) => {
  const { updateUserProfile, refreshProfile, setIsOnboarded, profileData } = useContext(AuthContext);

  const [currentStep, setCurrentStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const completeOnboarding = async () => {
    console.log("OnboardingContext.completeOnboarding() started", { phoneNumber, name, photo });

    const userData = {
      phone_number: phoneNumber,
      name: name,
      profile_image_url: photo,
    };

    try {
      console.log("OnboardingContext: Updating user profile...");
      await updateUserProfile(userData);

      console.log("OnboardingContext: Refreshing profile after update...");
      await refreshProfile();

      // Double-check that profileData is complete after refresh
      if (profileData && profileData.name && profileData.phoneNumber && profileData.profileImage) {
        console.log("OnboardingContext: Profile complete. Setting isOnboarded to true.");
        setIsOnboarded(true);
      } else {
        console.warn("OnboardingContext: Profile not fully complete after refresh. Check data:", profileData);
      }

      if (pendingAction) {
        console.log("OnboardingContext: Executing pending action...");
        await pendingAction();
        setPendingAction(null);
      }

      console.log("OnboardingContext.completeOnboarding() finished successfully.");
    } catch (error) {
      console.error("OnboardingContext.completeOnboarding() error:", error.message);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        phoneNumber,
        setPhoneNumber,
        otp,
        setOtp,
        name,
        setName,
        photo,
        setPhoto,
        completeOnboarding,
        pendingAction,
        setPendingAction,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingProvider;