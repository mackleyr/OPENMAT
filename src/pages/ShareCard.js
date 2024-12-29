// src/pages/ShareCard.js

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
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
  // If your route pattern is /share/:creatorName/:dealId
  const { creatorName, dealId } = useParams();

  const { cardData, setCardData } = useCard();

  // We’ll store the fetched “deal” from DB here
  const [dealData, setDealData] = useState(null);
  // If we want to fetch the creator’s user row
  const [creatorUser, setCreatorUser] = useState(null);

  // Overlays
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  // Prefill data for CardForm
  const [cardFormData, setCardFormData] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);
  const [loadingDeal, setLoadingDeal] = useState(true);

  // 1) On page load => fetch the deal from DB
  useEffect(() => {
    const fetchDeal = async () => {
      try {
        console.log("[ShareCard] useParams =>", { creatorName, dealId });

        // Build the share link we store in DB
        const lowerName = creatorName.toLowerCase().trim();
        const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;
        console.log("[ShareCard] shareURL =>", shareURL);

        // Query supabase by share_link
        const { data: dealRow, error } = await supabase
          .from("deals")
          .select("*")
          .eq("share_link", shareURL)
          .single();

        if (error || !dealRow) {
          console.error("[ShareCard] deal not found or supabase error:", error);
          setDealData(null);
          setLoadingDeal(false);
          return;
        }

        console.log("[ShareCard] Found deal =>", dealRow);
        setDealData(dealRow);
        setCurrentDealId(dealRow.id);

        // If the deal row has a creator_id => fetch user
        if (dealRow.creator_id) {
          console.log("[ShareCard] deal has creator_id =>", dealRow.creator_id);
          const { data: userRow, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", dealRow.creator_id)
            .single();

          if (userError) {
            console.error("[ShareCard] Error fetching user row:", userError);
          } else {
            console.log("[ShareCard] Found creatorUser =>", userRow);
            setCreatorUser(userRow);
          }
        }
      } catch (err) {
        console.error("[ShareCard] Unexpected error in fetchDeal():", err);
      } finally {
        setLoadingDeal(false);
      }
    };

    fetchDeal();
  }, [creatorName, dealId]);

  // Called when user taps “Open” or the plus button
  const handleOpenCardForm = () => {
    // Pre-fill from local context in case we want to keep that in sync
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
    console.log("[ShareCard] => handleSaveCard => final form data:", formData);

    // Merge form fields into global cardData
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

    setShowCardForm(false);
  };

  const handleProfileClick = () => {
    setShowProfileSheet(true);
  };

  if (loadingDeal) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-white mt-8 text-center">Loading deal...</div>
      </div>
    );
  }

  // If no deal found, show “Deal not found”
  if (!dealData) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-white mt-8 text-center">
          Deal not found.
        </div>
      </div>
    );
  }

  // Combine the fetched deal and fetched user
  const cardDataForDisplay = {
    value: dealData.deal_value || "",  // or dealData.title if numeric
    title: dealData.title || "",
    image: dealData.background || "",
    creatorName: creatorUser?.name || "",
    creatorPhoto: creatorUser?.profile_image_url || "",
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          {/* The “deal card” with fetched data */}
          <Card cardData={cardDataForDisplay} onOpenCardForm={handleOpenCardForm} />

          <div className="w-full max-w-[768px]">
            {/* “Copy Link” + “Share” Buttons */}
            <Buttons mode="share" />
            <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />
          </div>
        </div>

        <Footer />
        <AddButton onOpenCardForm={handleOpenCardForm} />

        {/* Onboarding Form Overlay */}
        {showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <OnboardingForm onComplete={handleOnboardingComplete} />
          </div>
        )}

        {/* Card Form Overlay */}
        {showCardForm && !showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <CardForm
              onClose={() => setShowCardForm(false)}
              onSave={handleSaveCard}
              initialData={cardFormData}
            />
          </div>
        )}

        {/* ProfileSheet Overlay */}
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
