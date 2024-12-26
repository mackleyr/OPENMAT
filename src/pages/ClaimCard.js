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
  const [loading, setLoading] = useState(true);

  // Overlays
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showSaveCard, setShowSaveCard] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  // For ActivityLog
  const [currentDealId, setCurrentDealId] = useState(null);

  // 1) Fetch the deal from Supabase
  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("*")
          .eq("id", dealId)
          .single();

        if (error) {
          console.error("Error fetching deal:", error);
          setDealData(null);
        } else {
          setDealData(data);
          setCurrentDealId(data.id);
        }
      } catch (err) {
        console.error("Unexpected error fetching deal:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeal();
  }, [dealId]);

  if (loading) {
    return <div className="text-center mt-8 text-white">Loading deal...</div>;
  }

  if (!dealData) {
    return <div className="text-center mt-8 text-white">Deal not found.</div>;
  }

  // 2) Handle “Claim” from the Buttons
  const handleClaim = () => {
    if (!userOnboarded) {
      setShowOnboardingForm(true);
    } else {
      // If onboarded, go to "SaveCard"
      setShowSaveCard(true);
    }
  };

  // 3) Onboarding complete => now show SaveCard
  const handleOnboardingComplete = (userData) => {
    console.log("ClaimCard => Onboarding complete for Parker:", userData);
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    // Show “SaveCard” overlay
    setShowSaveCard(true);
  };

  // 4) Profile sheet if needed
  const handleProfileClick = () => {
    setShowProfileSheet(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          <h1 className="text-2xl text-white mb-4">Deal shared by {creatorName}</h1>
          <div className="w-full max-w-[600px] mx-auto">
            {/* Render the card with the deal data */}
            <Card
              cardData={{
                value: dealData.title, 
                title: dealData.title,
                image: dealData.background,
              }}
              // We might keep this card non-editable
              isInForm={false}
            />

            {/* “Claim” + “Share” Buttons */}
            {/* Custom "Claim" function*/}
            <Buttons mode="claim" onClaim={handleClaim} />
          </div>
        </div>

        <Footer />
        <AddButton onOpenCardForm={() => {}} /> 
        <ActivityLog dealId={currentDealId} onProfileClick={handleProfileClick} />

        {/* Profile sheet overlay */}
        {showProfileSheet && (
          <div className="absolute inset-0 z-50">
            <ProfileSheet onClose={() => setShowProfileSheet(false)} />
          </div>
        )}

        {/* Onboarding overlay*/}
        {showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <OnboardingForm onComplete={handleOnboardingComplete} />
          </div>
        )}

        {/* SaveCard overlay*/}
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
