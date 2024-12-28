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

  const [dealData, setDealData] = useState(null);
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
        // LOG #1: Show what we got from React Router
        console.log("[ClaimCard] useParams =>", { creatorName, dealId });

        // 1) Force to lowercase
        const lowerName = creatorName.toLowerCase().trim();
        console.log("[ClaimCard] lowerName =>", lowerName);

        // 2) Build the EXACT share link we store in DB
        const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;
        console.log("[ClaimCard] shareURL =>", shareURL);

        // 3) Make the Supabase query
        console.log("[ClaimCard] Querying deals where share_link =", shareURL);
        const { data, error } = await supabase
          .from("deals")
          .select("*")
          .eq("share_link", shareURL)
          .single();

        // LOG #2: Check the response
        if (error) {
          console.error("[ClaimCard] Error fetching deal:", error);
          setDealData(null);
        } else {
          console.log("[ClaimCard] Found deal =>", data);
          setDealData(data);
          setCurrentDealId(data.id);
        }
      } catch (err) {
        console.error("[ClaimCard] Unexpected error in fetchDeal():", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  }, [creatorName, dealId]);

  // LOG #3: Let’s see if we got anything
  console.log("[ClaimCard] dealData =>", dealData);

  if (loading) {
    return <div className="text-center mt-8 text-white">Loading deal...</div>;
  }

  if (!dealData) {
    return <div className="text-center mt-8 text-white">Deal not found.</div>;
  }

  // If user taps “Claim,” we show onboarding if not done,
  // otherwise we show the "SaveCard" overlay.
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

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        
        {/* Main content (flex-1) */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <h1 className="text-2xl text-white mb-4">Deal shared by {creatorName}</h1>
          <div className="w-full max-w-[600px] mx-auto">
            <Card
              cardData={{
                value: dealData.title,
                title: dealData.title,
                image: dealData.background,
              }}
              isInForm={false}
            />
            <Buttons mode="claim" onClaim={handleClaim} />
            
            {/* Keep ActivityLog in the main content flow */}
            <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />
          </div>
        </div>

        {/* Footer at the bottom */}
        <Footer />

        {/* Add button floating above footer */}
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
