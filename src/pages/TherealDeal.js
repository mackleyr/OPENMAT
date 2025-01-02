import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import MainContainer from "../components/MainContainer";
import Footer from "../components/Footer";
import Card from "../components/Card";
import ActivityLog from "../components/ActivityLog";
import AddButton from "../components/AddButton";
import CardForm from "../components/CardForm";
import ProfileSheet from "../components/ProfileSheet";
import OnboardingForm from "../components/OnboardingForm";
import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";

// 1) import our new Buttons
import Buttons from "../components/Buttons";

// 2) import contexts
import { useCard } from "../contexts/CardContext";
import { useActivity } from "../contexts/ActivityContext";

function TherealDeal() {
  // We read optional params for “creatorName” + “dealId”, but we can handle empty or missing.
  const { creatorName, dealId } = useParams();
  const [searchParams] = useSearchParams();
  const sharerName = searchParams.get("sharer");

  // local states
  const [dealData, setDealData] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [userOnboarded, setUserOnboarded] = useState(false);

  const [currentDealId, setCurrentDealId] = useState(null);

  // from contexts
  const { cardData, setCardData } = useCard();
  const { addActivity } = useActivity();

  // load existing deal from /:creatorName/:dealId if present
  useEffect(() => {
    const fetchDeal = async () => {
      if (!creatorName || !dealId) {
        // no params => user might be creating from scratch
        setDealData(null);
        setLoading(false);
        return;
      }

      // build share URL pattern
      const lowerName = creatorName.toLowerCase().trim();
      const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;

      const { data: dealRow, error } = await supabase
        .from("deals")
        .select("*")
        .eq("share_link", shareURL)
        .single();

      if (error || !dealRow) {
        console.log("[TherealDeal] => no existing deal found, or error =>", error);
        setDealData(null);
        setLoading(false);
        return;
      }

      setDealData(dealRow);
      setCurrentDealId(dealRow.id);

      // fetch the user who created it
      if (dealRow.creator_id) {
        const { data: userRow } = await supabase
          .from("users")
          .select("*")
          .eq("id", dealRow.creator_id)
          .single();

        if (userRow) {
          setCreatorUser(userRow);

          // If we have a “sharer” name that differs from the creator’s, record a share activity
          if (sharerName && sharerName.toLowerCase() !== userRow.name.toLowerCase()) {
            await addActivity({
              userId: "non-creator-id", // Or upsert if you have phone, etc.
              userName: sharerName,
              userProfile: "",
              action: "shared gift card",
              dealId: dealRow.id,
            });
          } else {
            // else the original creator just shared it
            await addActivity({
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
  }, [creatorName, dealId, addActivity, sharerName]);

  // Decide if we have an existing deal in “edit mode” or if the user is creating from scratch
  const handleOpenCardForm = () => {
    // If we have existing deal data (from supabase), fill the form with that
    const existing = dealData || {};

    // Prepare data for <CardForm>
    const formData = {
      id: existing.id || null,
      expiresHours: existing.expires_at || null,
      dealValue: existing.deal_value || "",
      dealTitle: existing.title || "",
      dealDescription: existing.description || "",
      dealImage: existing.background || "",
      // or fallback to the user’s local “cardData”
      name: cardData?.name,
      profilePhoto: cardData?.profilePhoto,
    };

    setCardData((prev) => ({
      ...prev,
      ...formData,
    }));

    // If user not onboarded, show Onboarding first
    if (!userOnboarded) setShowOnboardingForm(true);
    else setShowCardForm(true);
  };

  const handleOnboardingComplete = () => {
    setUserOnboarded(true);
    setShowOnboardingForm(false);
    setShowCardForm(true);
  };

  // After we finish the CardForm (the user hits “Complete”)
  const handleSaveCard = async (formData) => {
    // 1) stash in context
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
    setCurrentDealId(formData.id);

    // 2) Upsert user
    const user = await upsertUser({
      phone_number: cardData.phone,
      name: cardData.name,
      profile_image_url: cardData.profilePhoto,
    });

    // 3) Add “created gift card” or “updated gift card”
    await addActivity({
      userId: user.id,
      userName: user.name,
      userProfile: user.profile_image_url,
      action: dealData ? "updated gift card" : "created gift card",
      dealId: formData.id,
    });
  };

  // handle “Share” — same as before
  const handleShareDeal = async () => {
    try {
      const user = await upsertUser({
        phone_number: cardData.phone,
        name: cardData.name,
        profile_image_url: cardData.profilePhoto,
      });

      // Insert a row in `shares` if you want referral logic
      await supabase.from("shares").insert({
        deal_id: currentDealId,
        sharer_id: user.id,
      });

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
      console.error("[TherealDeal] handleShareDeal error =>", err);
      alert("Error sharing deal.");
    }
  };

  // handle “Claim”
  const handleClaim = async () => {
    // If user not onboarded, prompt for onboarding
    if (!userOnboarded) {
      setShowOnboardingForm(true);
      return;
    }

    // otherwise, do something to “claim” in DB
    try {
      const user = await upsertUser({
        phone_number: cardData.phone,
        name: cardData.name,
        profile_image_url: cardData.profilePhoto,
      });

      await addActivity({
        userId: user.id,
        userName: user.name,
        userProfile: user.profile_image_url,
        action: "claimed gift card",
        dealId: currentDealId,
      });

      alert("You claimed this gift card!");
    } catch (err) {
      console.error("[TherealDeal] handleClaim error =>", err);
      alert("Error claiming deal.");
    }
  };

  if (loading) return <div className="text-center mt-8 text-white">Loading deal...</div>;

  // If we loaded a specific deal from DB, use that for display in <Card>
  // Else if we’re fresh => cardData might contain partial data
  const cardDataForDisplay = {
    value: dealData?.deal_value || cardData?.value || "",
    title: dealData?.title || cardData?.title || "",
    image: dealData?.background || cardData?.image || "",
    creatorName: creatorUser?.name || cardData?.name || "",
    creatorPhoto: creatorUser?.profile_image_url || cardData?.profilePhoto || "",
  };

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          {/* 1) The big card display */}
          <Card cardData={cardDataForDisplay} onOpenCardForm={handleOpenCardForm} />

          {/* 2) Buttons: left => “Copy Link”, right => “Claim” 
              plus the share logic. 
          */}
          <Buttons
            mode="share"       // we can keep “share” so the left button is “Copy Link”
            onShare={handleShareDeal}
            onClaim={handleClaim} // override so the right button is “Claim”
          />

          {/* 3) ActivityLog for this deal */}
          <ActivityLog dealId={currentDealId} />
        </div>

        {/* add “Add” button => opens the card form */}
        <Footer />
        <AddButton onOpenCardForm={handleOpenCardForm} />

        {/* Conditionals for modals */}
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
        {showCardForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <CardForm
              onClose={() => setShowCardForm(false)}
              onSave={handleSaveCard}
              initialData={cardData} // or build a formData object as above
            />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default TherealDeal;
