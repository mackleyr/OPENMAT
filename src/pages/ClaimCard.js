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
  // The URL pattern is /share/:creatorName/:dealId
  const { creatorName, dealId } = useParams();

  // Deal row from Supabase
  const [dealData, setDealData] = useState(null);

  // Optionally, store the user row (creator info)
  const [creatorUser, setCreatorUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // Overlays
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showSaveCard, setShowSaveCard] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  // For ActivityLog, etc.
  const [currentDealId, setCurrentDealId] = useState(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        console.log("[ClaimCard] useParams =>", { creatorName, dealId });

        // 1) Force creatorName to lowercase
        const lowerName = creatorName.toLowerCase().trim();
        console.log("[ClaimCard] lowerName =>", lowerName);

        // 2) Build the EXACT share link we store in DB (lowercased)
        const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;
        console.log("[ClaimCard] shareURL =>", shareURL);

        // 3) Query supabase by share_link
        console.log("[ClaimCard] Querying deals where share_link =", shareURL);
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

        // 4) Optionally fetch the user row if you want name/profile
        if (dealRow.creator_id) {
          console.log("[ClaimCard] deal has creator_id =>", dealRow.creator_id);
          console.log("[ClaimCard] Fetching user row...");
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
        } else {
          console.warn("[ClaimCard] dealRow has no creator_id. Possibly created anonymously?");
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
    // If we couldn't find the row, or error
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
    console.log("[ClaimCard] handleProfileClick() -> showProfileSheet");
    setShowProfileSheet(true);
  };

  // Build a combined card object that also includes user info
  const cardDataForDisplay = {
    value: dealData.title,
    title: dealData.title,
    image: dealData.background,
    // If you want to show the creator's name or profile photo on the card
    creatorName: creatorUser?.name,
    creatorPhoto: creatorUser?.profile_image_url,
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">

        {/* Main content (deal card, claim/share buttons, activity) */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <div className="w-full max-w-[600px] mx-auto">
            {/* The “deal card” with optional user info */}
            <Card 
              cardData={cardDataForDisplay}
              isInForm={false}
            />

            {/* “Claim” + “Share” Buttons */}
            <Buttons mode="claim" onClaim={handleClaim} />

            {/* Activity log (e.g. for comments or updates) */}
            <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />
          </div>
        </div>

        <Footer />
        <AddButton onOpenCardForm={() => {}} />

        {/* Overlays: ProfileSheet, Onboarding, SaveCard */}
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
