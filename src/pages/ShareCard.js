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
  const { cardData } = useCard();
  const { creatorName = "", dealId = "" } = useParams(); // Safe destructuring

  // If either param is missing, gracefully show a fallback
  if (!creatorName || !dealId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <h1 className="text-2xl">No share parameters in URL.</h1>
      </div>
    );
  }

  // Now safe to do .toLowerCase()
  const lowerName = creatorName.toLowerCase().trim();

  // Local states for fetching
  const [dealData, setDealData] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [loadingDeal, setLoadingDeal] = useState(true);

  // Overlays
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  // For <CardForm>
  const [cardFormData, setCardFormData] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        console.log("[ShareCard] useParams =>", { creatorName, dealId });
        const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;
        console.log("[ShareCard] shareURL =>", shareURL);

        // 1) Query the "deals" table by share_link
        const { data: dealRow, error } = await supabase
          .from("deals")
          .select("*")
          .eq("share_link", shareURL)
          .single();

        if (error || !dealRow) {
          console.error("[ShareCard] error fetching deal or no rows:", error);
          setDealData(null);
          setLoadingDeal(false);
          return;
        }

        console.log("[ShareCard] Found deal =>", dealRow);
        setDealData(dealRow);
        setCurrentDealId(dealRow.id);

        // 2) If there's a creator_id, also fetch the user record
        if (dealRow.creator_id) {
          const { data: userRow, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", dealRow.creator_id)
            .single();

          if (userError) {
            console.error("[ShareCard] user fetch error =>", userError);
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
  }, [creatorName, dealId, lowerName]);

  if (loadingDeal) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <h1 className="text-xl">Loading deal...</h1>
      </div>
    );
  }

  if (!dealData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <h1 className="text-xl">Deal not found.</h1>
      </div>
    );
  }

  // Combine DB fields + user for card display
  const cardDataForDisplay = {
    value: dealData.deal_value || "",
    title: dealData.title || "",
    image: dealData.background || "",
    creatorName: creatorUser?.name || "",
    creatorPhoto: creatorUser?.profile_image_url || "",
  };

  // “Open Card Form” logic as desired
  const handleOpenCardForm = () => {
    setCardFormData({
      // Possibly some prefill from dealData, or from global context, etc.
      id: dealData.id,
      dealValue: dealData.deal_value,
      dealTitle: dealData.title,
      dealImage: dealData.background,
      // ...
    });
    setShowCardForm(true);
  };

  // Example “onboarding complete”
  const handleOnboardingComplete = (userData) => {
    console.log("[ShareCard] Onboarding complete =>", userData);
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowCardForm(true);
  };

  // Example “save card” from CardForm
  const handleSaveCard = (formData) => {
    console.log("[ShareCard] handleSaveCard => final form data:", formData);
    // merge or set global cardData if needed, or reload from DB
    setShowCardForm(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <Card cardData={cardDataForDisplay} />

          <div className="w-full max-w-[768px] py-4">
            <Buttons mode="share" />
            <ActivityLog dealId={currentDealId} onProfileClick={() => setShowProfileSheet(true)} />
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
          <div className="absolute inset-0 z-50 bg-white">
            <ProfileSheet onClose={() => setShowProfileSheet(false)} />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default ShareCard;
