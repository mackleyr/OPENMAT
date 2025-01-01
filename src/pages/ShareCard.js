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

import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";
import { useActivity } from "../contexts/ActivityContext";

function ShareCard() {
  const { cardData, setCardData } = useCard();
  const { addActivity } = useActivity(); // <--- from our new context
  const [currentDealId, setCurrentDealId] = useState(null);

  // Modals
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  const [cardFormData, setCardFormData] = useState(null);

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

  const handleOnboardingComplete = () => {
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowCardForm(true);
  };

  const handleSaveCard = async (formData) => {
    // 1) Merge new deal data
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

    // 2) Upsert “created gift card”
    // If you do upsertUser here to get userId, do so:
    const user = await upsertUser({
      phone_number: cardData.phone,
      name: cardData.name,
      profile_image_url: cardData.profilePhoto,
    });

    await addActivity({
      userId: user.id,
      userName: user.name,
      userProfile: user.profile_image_url,
      action: "created gift card",
      dealId: formData.id,
    });
  };

  const handleShareDeal = async () => {
    try {
      const user = await upsertUser({
        phone_number: cardData.phone,
        name: cardData.name,
        profile_image_url: cardData.profilePhoto,
      });

      // Insert a row in `shares` if you want referral logic
      await supabase
        .from("shares")
        .insert({ deal_id: currentDealId, sharer_id: user.id });

      // Upsert “shared gift card” to the DB
      await addActivity({
        userId: user.id,
        userName: user.name,
        userProfile: user.profile_image_url,
        action: "shared gift card",
        dealId: currentDealId,
      });

      alert("Deal shared successfully!");
    } catch (err) {
      console.error("[ShareCard] handleShareDeal error =>", err);
      alert("Error sharing deal.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <Card onOpenCardForm={handleOpenCardForm} />
          <div className="w-full max-w-[768px]">
            <Buttons mode="share" onShare={handleShareDeal} />
            {/**
             * Now <ActivityLog> pulls from the global DB-based context
             * so it instantly shows "created gift card" or "shared gift card"
             */}
            <ActivityLog dealId={currentDealId} />
          </div>
        </div>
        <Footer />
        <AddButton onOpenCardForm={handleOpenCardForm} />

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
