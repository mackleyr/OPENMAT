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
  const { cardData, setCardData } = useCard();

  // Safely destructure params
  const { creatorName = "", dealId = "" } = useParams();

  // If either is missing, skip fetch
  if (!creatorName || !dealId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        No share parameters in URL.
      </div>
    );
  }

  // Now safe to do .toLowerCase()
  const lowerName = creatorName.toLowerCase().trim();

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
    // Example fetch logic
    const fetchDeal = async () => {
      try {
        console.log("[ShareCard] => useParams:", { creatorName, dealId });
        const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;
        console.log("[ShareCard] => shareURL:", shareURL);

        // 1) Lookup the deal
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

        // 2) If there's a creator_id, fetch user
        if (dealRow.creator_id) {
          const { data: userRow, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", dealRow.creator_id)
            .single();

          if (userError) {
            console.error("[ShareCard] Error fetching userRow:", userError);
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

  // Then your card + form logic, etc.
  // ...

  if (loadingDeal) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading deal...
      </div>
    );
  }
  if (!dealData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Deal not found.
      </div>
    );
  }

  // Combine fetched data for the display card
  const cardDataForDisplay = {
    value: dealData.deal_value || "",
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