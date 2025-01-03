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

  // URL parameters: /share/:creatorName/:dealId
  const { creatorName, dealId } = useParams();
  const [searchParams] = useSearchParams();
  const sharerName = searchParams.get("sharer");

  // Local onboarding state
  const [localUserId, setLocalUserId] = useState(null);
  const userOnboarded = !!localUserId;

  // Modals/forms
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [cardFormData, setCardFormData] = useState(null);

  // Loading and "deal not found" states
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);

  // Fetched deal, if any
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  // Prevent multiple "shared gift card" logs in the same session
  const [alreadyShared, setAlreadyShared] = useState(false);

  // ──────────────────────────────────────────────────────────
  // 1) If we have /:creatorName/:dealId => fetch an existing deal by share_link
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDeal = async () => {
      if (!creatorName || !dealId) {
        // No URL params => user creating brand-new deal
        setLoading(false);
        setDealFound(false);
        return;
      }

      const lowerName = creatorName.toLowerCase().trim();
      const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;

      console.log("[TheRealDeal] => Attempting to fetch existing deal via =>", shareURL);

      const { data: dealRow, error } = await supabase
        .from("deals")
        .select("*")
        .eq("share_link", shareURL)
        .single();

      if (error || !dealRow) {
        console.log("[TheRealDeal] => No deal found or error =>", error);
        setDealFound(false);
        setLoading(false);
        return;
      }

      console.log("[TheRealDeal] => Found existing deal =>", dealRow);
      setFetchedDeal(dealRow);
      setDealFound(true);
      setLoading(false);
      setCurrentDealId(dealRow.id);

      // Possibly fetch the creator to see if "sharer" differs
      if (dealRow.creator_id) {
        const { data: userRow } = await supabase
          .from("users")
          .select("*")
          .eq("id", dealRow.creator_id)
          .single();

        if (userRow) {
          setCreatorUser(userRow);

          // Only log "shared gift card" once per session
          if (!alreadyShared) {
            if (sharerName && sharerName.toLowerCase() !== userRow.name.toLowerCase()) {
              // Non-creator scenario => log share
              await addActivity({
                userId: "anon-sharer",
                action: "shared gift card",
                dealId: dealRow.id,
              });
            } else {
              // Creator scenario => also log share
              await addActivity({
                userId: userRow.id,
                action: "shared gift card",
                dealId: dealRow.id,
              });
            }
            setAlreadyShared(true);
          }
        }
      }
    };

    fetchDeal();
  }, [creatorName, dealId, sharerName, addActivity, alreadyShared]);

  // ──────────────────────────────────────────────────────────
  // 2) Once we fetch the existing deal, sync it to cardData
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (fetchedDeal) {
      console.log("[TheRealDeal] => Setting cardData from fetchedDeal =>", fetchedDeal);

      setCardData((prev) => ({
        ...prev,
        id: fetchedDeal.id,
        creatorId: fetchedDeal.creator_id || null,
        title: fetchedDeal.title || "",
        value: fetchedDeal.deal_value || "",
        image: fetchedDeal.background || "",
        expires: fetchedDeal.expires_at || null,
        share_link: fetchedDeal.share_link,
      }));
      setCurrentDealId(fetchedDeal.id);
    }
  }, [fetchedDeal, setCardData]);

  // ──────────────────────────────────────────────────────────
  // 3) handleCopyLink => share logic
  // ──────────────────────────────────────────────────────────
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

      // "shared gift card"
      await addActivity({
        userId: localUserId || "anon",
        action: "shared gift card",
        dealId: cardData.id || currentDealId,
      });
    } catch (err) {
      console.error("[TheRealDeal] handleCopyLink =>", err);
    }
  };

  // ──────────────────────────────────────────────────────────
  // 4) Claim => user must be onboarded
  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // 5) openCardForm => for new or existing deal
  // ──────────────────────────────────────────────────────────
  const handleOpenCardForm = () => {
    if (!userOnboarded) {
      setShowOnboardingForm(true);
      return;
    }
    if (cardData.id && cardData.creatorId && cardData.creatorId !== localUserId) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }

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

  // ──────────────────────────────────────────────────────────
  // 6) Onboarding => user info
  // ──────────────────────────────────────────────────────────
  const handleOnboardingComplete = async (userData) => {
    const user = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto,
    });
    setLocalUserId(user.id);
    setShowOnboardingForm(false);

    setShowCardForm(true);
  };

  // ──────────────────────────────────────────────────────────
  // 7) handleSaveCard => from CardForm => merges new deal data
  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // 8) Render logic => loading or deal not found
  // ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">
          Loading deal...
        </div>
      </div>
    );
  }
  if (creatorName && dealId && !dealFound) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">
          Deal not found.
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 9) Normal UI => fresh or existing deal
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        {/* Main content */}
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
        {showCardForm && !showOnboardingForm && (
          <div className="absolute inset-0 z-50 bg-white">
            <CardForm
              onClose={() => setShowCardForm(false)}
              onSave={handleSaveCard}
              initialData={cardFormData}
            />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

export default TheRealDeal;