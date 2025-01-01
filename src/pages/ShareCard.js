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

// Import supabase and your upsertUser service
import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";
import { useActivity } from "../contexts/ActivityContext";

function ShareCard() {
  const { cardData, setCardData } = useCard();
  const { addActivity } = useActivity();

  const [currentDealId, setCurrentDealId] = useState(null);

  // Modals
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  // For CardForm
  const [cardFormData, setCardFormData] = useState(null);

  // Called when user taps “+” or “Open”
  const handleOpenCardForm = () => {
    setCardFormData({
      id: cardData.id,
      expiresHours: cardData.expires,
      dealValue: cardData.value,
      dealTitle: cardData.title,
      dealDescription: cardData.description || "",
      dealImage: cardData.image,
      name: cardData.name,
      profilePhoto: cardData.profilePhoto,
    });

    if (!userOnboarded) {
      setShowOnboardingForm(true);
    } else {
      setShowCardForm(true);
    }
  };

  // After Onboarding
  const handleOnboardingComplete = () => {
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowCardForm(true);
  };

  // After completing CardForm
  const handleSaveCard = (formData) => {
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      expires: formData.expiresHours,
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      description: formData.dealDescription,
      name: formData.name,
      profilePhoto: formData.profilePhoto,
    }));
    setCurrentDealId(formData.id);
    setShowCardForm(false);
  };

  // New function to track “shared deal” in DB
  const handleShareDeal = async () => {
    try {
      // 1) Ensure user has a row in `users`
      const user = await upsertUser({
        phone_number: cardData.phone,
        name: cardData.name,
        profile_image_url: cardData.profilePhoto,
      });
      // 2) Insert a row in `shares` table
      const { data, error } = await supabase
        .from("shares")
        .insert({
          deal_id: currentDealId,
          sharer_id: user.id,
        })
        .single();
      if (error) throw error;

      // 3) Also log to local ActivityContext
      addActivity({
        userId: user.id,
        name: user.name,
        profileImage: user.profile_image_url,
        action: "shared gift card",
        dealId: currentDealId,
        timestamp: new Date().toISOString(),
      });

      // Optionally: copy link to clipboard or show success
      console.log("[ShareCard] => Shared deal inserted in DB:", data);
      alert("Deal shared successfully!");
    } catch (err) {
      console.error("[ShareCard] handleShareDeal error =>", err);
      alert("Error sharing deal.");
    }
  };

  const handleProfileClick = () => setShowProfileSheet(true);

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <Card onOpenCardForm={handleOpenCardForm} />
          <div className="w-full max-w-[768px]">
            {/* Pass handleShareDeal to Buttons */}
            <Buttons mode="share" onShare={handleShareDeal} />
            <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />
          </div>
        </div>
        <Footer />
        <AddButton onOpenCardForm={handleOpenCardForm} />

        {/* Overlays */}
        {showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <OnboardingForm onComplete={handleOnboardingComplete} />
          </div>
        )}
        {showCardForm && !showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <CardForm
              onClose={() => setShowCardForm(false)}
              onSave={handleSaveCard}
              initialData={cardFormData}
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

export default ShareCard;
