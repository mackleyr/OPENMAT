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

  // URL params: /share/:creatorName/:dealId
  const { creatorName, dealId } = useParams();
  const [searchParams] = useSearchParams();
  const sharerName = searchParams.get("sharer");

  // local user Onboarding ID
  const [localUserId, setLocalUserId] = useState(null);
  const userOnboarded = !!localUserId;

  // For modals
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);

  const [cardFormData, setCardFormData] = useState(null);

  // "Loading" and "deal not found" logic
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);

  // We store the fetched "deal" from supabase, if any
  // Then we sync to `cardData` once we have it
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);

  // local store of the current deal ID
  const [currentDealId, setCurrentDealId] = useState(null);

  // ──────────────────────────────────────────────────────────
  // 1) On mount, if we have /:creatorName/:dealId, fetch the deal from supabase
  //    by matching share_link = https://and.deals/share/<creatorName>/<dealId>
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDeal = async () => {
      // If no creatorName or dealId, user might be creating a new deal
      if (!creatorName || !dealId) {
        setLoading(false);
        setDealFound(false);
        return;
      }

      const lowerName = creatorName.toLowerCase().trim();
      const shareURL = `https://and.deals/share/${lowerName}/${dealId}`;

      console.log("[TheRealDeal] => Attempting to fetch existing deal via share_link =>", shareURL);

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

      // Optionally fetch the user who created it
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
            // Non-creator scenario => log "shared"
            await addActivity({
              userId: "anon-sharer", // or upsert if you want
              action: "shared gift card",
              dealId: dealRow.id,
            });
          } else {
            // Creator scenario => also log "shared gift card"
            await addActivity({
              userId: userRow.id,
              action: "shared gift card",
              dealId: dealRow.id,
            });
          }
        }
      }
    };

    fetchDeal();
  }, [creatorName, dealId, sharerName, addActivity]);

  // ──────────────────────────────────────────────────────────
  // 2) Once we fetch an existing deal, let's store it in cardData
  //    so the UI can see the correct title, value, etc.
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
  // 3) "share" param => If there's a ?sharer=..., we handle it in effect
  //    but we already do that in fetchDeal if we have a real existing deal
  // ──────────────────────────────────────────────────────────
  // 4) Copy Link
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
  // 5) Claim
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
  // 6) open Card Form => for editing or new creation
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

    // Prepare data
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
  // 7) Onboarding
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
  // 8) handleSaveCard => called by CardForm once the deal is created or updated
  // ──────────────────────────────────────────────────────────
  const handleSaveCard = async (formData) => {
    // Merge new deal data
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
  // 9) Render logic: handle "loading" or "deal not found"
  // ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Loading deal...</div>
      </div>
    );
  }
  if (creatorName && dealId && !dealFound) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Deal not found.</div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 10) Otherwise, show the normal UI
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      <MainContainer className="relative flex flex-col justify-between h-full">
        {/* Page Content */}
        <div className="flex-1 flex flex-col items-center justify-start w-full px-[4%] py-[4%]">
          {/* Card display */}
          <Card onOpenCardForm={handleOpenCardForm} />
          <div className="w-full max-w-[768px]">
            {/* Copy Link / Claim Buttons */}
            <Buttons
              onShare={handleCopyLink}
              onClaim={handleClaim}
            />
            {/* Show activity log for this deal */}
            <ActivityLog dealId={cardData.id || currentDealId} />
          </div>
        </div>
        <Footer />

        {/* Add Button => same openCardForm */}
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
