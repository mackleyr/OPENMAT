import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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

// 1) Import the activity context
import { useActivity } from "../contexts/ActivityContext";
import { upsertUser } from "../services/usersService";

function ClaimCard() {
  const { creatorName, dealId } = useParams();
  const [searchParams] = useSearchParams();
  const sharerName = searchParams.get("sharer");

  const [dealData, setDealData] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showSaveCard, setShowSaveCard] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  const [currentDealId, setCurrentDealId] = useState(null);

  // from global DB-based context
  const { addActivityToDB } = useActivity();

  useEffect(() => {
    const fetchDeal = async () => {
      if (!creatorName || !dealId) {
        setDealData(null);
        setLoading(false);
        return;
      }

      const lowerName = creatorName.toLowerCase().trim();
      const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;

      const { data: dealRow, error } = await supabase
        .from("deals")
        .select("*")
        .eq("share_link", shareURL)
        .single();

      if (error || !dealRow) {
        setDealData(null);
        setLoading(false);
        return;
      }

      setDealData(dealRow);
      setCurrentDealId(dealRow.id);

      if (dealRow.creator_id) {
        const { data: userRow } = await supabase
          .from("users")
          .select("*")
          .eq("id", dealRow.creator_id)
          .single();

        if (userRow) {
          setCreatorUser(userRow);

          // Distinguish "creator share" from "non-creator share"
          if (sharerName && sharerName.toLowerCase() !== userRow.name.toLowerCase()) {
            // Non-creator scenario
            await addActivityToDB({
              userId: "non-creator-id", // or upsert if you pass phone, etc.
              userName: sharerName,
              userProfile: "", // unknown
              action: "shared gift card",
              dealId: dealRow.id,
            });
          } else {
            // Creator scenario
            await addActivityToDB({
              userId: userRow.id,
              userName: userRow.name,
              userProfile: userRow.profile_image_url,
              action: "shared gift card",
              dealId: dealRow.id,
            });
          }
        }
      }
      setLoading(false);
    };

    fetchDeal();
  }, [creatorName, dealId, addActivityToDB, sharerName]);

  const handleClaim = () => {
    if (!userOnboarded) setShowOnboardingForm(true);
    else setShowSaveCard(true);
  };

  const handleOnboardingComplete = async (userData) => {
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowSaveCard(true);

    // 1) Upsert user to get real ID
    const newUser = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto,
    });

    // 2) Upsert "claimed gift card"
    await addActivityToDB({
      userId: newUser.id,
      userName: newUser.name,
      userProfile: newUser.profile_image_url,
      action: "claimed gift card",
      dealId: dealData.id,
    });
  };

  if (loading) return <div className="text-center mt-8 text-white">Loading deal...</div>;
  if (!dealData) return <div className="text-center mt-8 text-white">Deal not found.</div>;

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
            <Card cardData={cardDataForDisplay} />
            <Buttons mode="claim" onClaim={handleClaim} />
            <ActivityLog dealId={currentDealId} />
          </div>
        </div>
        <Footer />
        <AddButton onOpenCardForm={() => {}} />

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
