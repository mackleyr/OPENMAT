// src/pages/ShareCard.js

import React, { useState } from "react";
import { useCard } from "../contexts/CardContext";
import MainContainer from "../components/MainContainer";
import Footer from "../components/Footer";
import Card from "../components/Card";
import Buttons from "../components/Buttons";
import ActivityLog from "../components/ActivityLog";
import AddButton from "../components/AddButton";
import CardForm from "../components/CardForm";
import ProfileSheet from "../components/ProfileSheet";
import OnboardingForm from "../components/OnboardingForm";
import "../index.css";

function ShareCard() {
  const { cardData, setCardData } = useCard();

  // Show/hide modals
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  // Prefill data for the form
  const [cardFormData, setCardFormData] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  // Called when user taps “Open” or the add button
  const handleOpenCardForm = () => {
    // Pre-fill from context
    setCardFormData({
      id: cardData.id,
      expiresHours: cardData.expires,
      dealValue: cardData.value,
      dealTitle: cardData.title,
      dealDescription: cardData.description || "",
      dealImage: cardData.image,

      // Also pass name + profilePhoto into the form
      name: cardData.name,
      profilePhoto: cardData.profilePhoto,
    });
    setCurrentDealId(cardData?.id || null);

    // Onboarding check
    if (!userOnboarded) {
      setShowOnboardingForm(true);
    } else {
      setShowCardForm(true);
    }
  };

  // Called if user finishes onboarding
  const handleOnboardingComplete = (userData) => {
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowCardForm(true);
  };

  // Called after user taps “Complete” in <CardForm>
  const handleSaveCard = (formData) => {
    console.log("ShareCard -> handleSaveCard -> final form data:", formData);

    // Merge form fields into global cardData, including name/profilePhoto
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      expires: formData.expiresHours,
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      description: formData.dealDescription,

      // CRITICAL: store user name + photo from the form
      name: formData.name,
      profilePhoto: formData.profilePhoto,
    }));

    // Close the form
    setShowCardForm(false);
  };

  const handleProfileClick = () => {
    setShowProfileSheet(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          {/* The “home screen” card reading from context */}
          <Card onOpenCardForm={handleOpenCardForm} />

          <div className="w-full max-w-[768px]">
            <Buttons mode="share" />
            <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />
          </div>
        </div>

        <Footer />
        <AddButton onOpenCardForm={handleOpenCardForm} />

        {/* Onboarding form overlay */}
        {showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <OnboardingForm onComplete={handleOnboardingComplete} />
          </div>
        )}

        {/* Card form overlay */}
        {showCardForm && !showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <CardForm
              onClose={() => setShowCardForm(false)}
              onSave={handleSaveCard}
              initialData={cardFormData}
            />
          </div>
        )}

        {/* Profile sheet overlay */}
        {showProfileSheet && (
          <div className="absolute inset-0 z-50">
            <ProfileSheet onClose={() => setShowProfileSheet(false)} />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default ShareCard;
