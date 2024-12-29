// src/pages/ClaimCard.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Card from "../components/Card";
import Buttons from "../components/Buttons";
import MainContainer from "../components/MainContainer";
import Footer from "../components/Footer";
import ActivityLog from "../components/ActivityLog";
import AddButton from "../components/AddButton";
import ProfileSheet from "../components/ProfileSheet";
import OnboardingForm from "../components/OnboardingForm";
import SaveCard from "../components/SaveCard";
import "../index.css";

function ClaimCard() {
  const { creatorName, dealId } = useParams();

  const [dealData, setDealData] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Overlays
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showSaveCard, setShowSaveCard] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  const [currentDealId, setCurrentDealId] = useState(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        console.log("[ClaimCard] useParams =>", { creatorName, dealId });

        if (!creatorName || !dealId) {
          console.warn("[ClaimCard] No route params -> skipping fetch");
          setDealData(null);
          setLoading(false);
          return;
        }

        // Lowercase the name
        const lowerName = creatorName.toLowerCase().trim();
        const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;
        console.log("[ClaimCard] shareURL =>", shareURL);

        // Query deals by share_link
        const { data: dealRow, error } = await supabase
          .from("deals")
          .select("*")
          .eq("share_link", shareURL)
          .single();

        if (error) {
          console.error("[ClaimCard] Error fetching deal:", error);
          setDealData(null);
          setLoading(false);
          return;
        }

        console.log("[ClaimCard] Found deal =>", dealRow);
        setDealData(dealRow);
        setCurrentDealId(dealRow.id);

        // If there's a creator_id, fetch that user
        if (dealRow.creator_id) {
          console.log("[ClaimCard] deal has creator_id =>", dealRow.creator_id);
          const { data: userRow, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", dealRow.creator_id)
            .single();

          if (userError) {
            console.error("[ClaimCard] Error fetching user:", userError);
          } else {
            console.log("[ClaimCard] Found user =>", userRow);
            setCreatorUser(userRow);
          }
        }
      } catch (err) {
        console.error("[ClaimCard] Unexpected error in fetchDeal():", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  }, [creatorName, dealId]);

  console.log("[ClaimCard] final dealData =>", dealData);
  console.log("[ClaimCard] final creatorUser =>", creatorUser);

  if (loading) {
    return <div className="text-center mt-8 text-white">Loading deal...</div>;
  }

  if (!dealData) {
    return <div className="text-center mt-8 text-white">Deal not found.</div>;
  }

  // Called when user taps "Claim"
  const handleClaim = () => {
    console.log("[ClaimCard] handleClaim() called");
    if (!userOnboarded) {
      console.log("[ClaimCard] user not onboarded -> show Onboarding");
      setShowOnboardingForm(true);
    } else {
      console.log("[ClaimCard] user already onboarded -> show SaveCard");
      setShowSaveCard(true);
    }
  };

  const handleOnboardingComplete = (userData) => {
    console.log("[ClaimCard] Onboarding complete =>", userData);
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowSaveCard(true);
  };

  const handleProfileClick = () => {
    setShowProfileSheet(true);
  };

  // Build the final cardData for display
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
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <div className="w-full max-w-[600px] mx-auto">
            <Card cardData={cardDataForDisplay} isInForm={false} />
            <Buttons mode="claim" onClaim={handleClaim} />
            <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />
          </div>
        </div>

        <Footer />
        <AddButton onOpenCardForm={() => {}} />

        {/* Overlays */}
        {showProfileSheet && (
          <div className="absolute inset-0 z-50">
            <ProfileSheet onClose={() => setShowProfileSheet(false)} />
          </div>
        )}
        {showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <OnboardingForm onComplete={handleOnboardingComplete} />
          </div>
        )}
        {showSaveCard && (
          <div className="absolute inset-0 z-50 bg-white">
            <SaveCard onClose={() => setShowSaveCard(false)} dealData={dealData} />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default ClaimCard;
