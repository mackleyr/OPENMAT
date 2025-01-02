// src/pages/TheRealDeal.js
import React, { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
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

function TheRealDeal() {
  const { cardData, setCardData } = useCard();
  const { addActivity } = useActivity();

  // Optional URL parameters
  const { creatorName, dealId } = useParams();
  const [searchParams] = useSearchParams();

  // local user state
  const [localUserId, setLocalUserId] = useState(null); 
  // e.g. store the user’s ID once they onboard

  // Current deal
  const [currentDealId, setCurrentDealId] = useState(null);

  // Modals
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);

  const [cardFormData, setCardFormData] = useState(null);

  const userOnboarded = !!localUserId;

  // If we load an existing deal from /share/:creatorName/:dealId, you can do so here
  useEffect(() => {
    if (!creatorName || !dealId) return;
    // TODO: fetch the existing deal from supabase if needed
    // setCardData(...), setCurrentDealId(...)
  }, [creatorName, dealId, setCardData]);

  // If there's a "sharer" param, log "shared gift card" once
  useEffect(() => {
    const sharerName = searchParams.get("sharer");
    if (!sharerName || !dealId) return;

    addActivity({
      userId: `anon-${sharerName}`,
      // "shared gift card"
      action: "shared gift card",
      dealId: dealId,
    });
  }, [searchParams, dealId, addActivity]);

  // COPY LINK => build user-specific link
  const handleCopyLink = async () => {
    if (!cardData?.share_link) {
      console.log("No share link to copy.");
      return;
    }
    try {
      const userName = cardData.name || "anon";
      const linkWithSharer = `${cardData.share_link}?sharer=${encodeURIComponent(userName)}`;

      await navigator.clipboard.writeText(linkWithSharer);
      alert("Link copied: " + linkWithSharer);

      // Insert "shared gift card" activity
      await addActivity({
        userId: localUserId || "anon",
        action: "shared gift card",
        dealId: cardData.id || currentDealId,
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  // CLAIM
  const handleClaim = async () => {
    if (!userOnboarded) {
      setShowOnboardingForm(true);
      return;
    }
    if (!cardData.id) {
      alert("No deal to claim yet!");
      return;
    }
    try {
      const user = await upsertUser({
        phone_number: cardData.phone,
        name: cardData.name,
        profile_image_url: cardData.profilePhoto,
      });
      setLocalUserId(user.id);

      // "claimed gift card"
      await addActivity({
        userId: user.id,
        action: "claimed gift card",
        dealId: cardData.id,
      });

      alert("You claimed this gift card!");
    } catch (err) {
      console.error("[TheRealDeal] handleClaim error =>", err);
      alert("Error claiming deal.");
    }
  };

  // OPEN CARD FORM
  const handleOpenCardForm = () => {
    if (!userOnboarded) {
      setShowOnboardingForm(true);
      return;
    }
    // If existing deal + not creator => block editing
    if (cardData.id && cardData.creatorId && cardData.creatorId !== localUserId) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }
    // Prepare form data for CardForm
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
    setShowCardForm(true);
  };

  // ONBOARDING COMPLETE
  const handleOnboardingComplete = async (userData) => {
    const user = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto,
    });
    setLocalUserId(user.id);
    setShowOnboardingForm(false);

    // then open the card form
    setShowCardForm(true);
  };

  // Called by CardForm => newly created or updated deal
  const handleSaveCard = async (formData) => {
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      creatorId: localUserId,
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

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <Card onOpenCardForm={handleOpenCardForm} />
          <div className="w-full max-w-[768px]">
            <Buttons
              onShare={handleCopyLink}
              onClaim={handleClaim}
            />
            <ActivityLog dealId={cardData.id || currentDealId} />
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

export default TheRealDeal;
