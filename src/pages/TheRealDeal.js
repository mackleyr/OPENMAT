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
import OnboardingForm from "../components/OnboardingForm";
import ProfileSheet from "../components/ProfileSheet";  // <-- Make sure to import
import SaveSheet from "../components/SaveSheet";         // (formerly ClaimDeal)
import "../index.css";

import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";
import { useActivity } from "../contexts/ActivityContext";

function TheRealDeal() {
  const { cardData, setCardData } = useCard();
  const { addActivity, fetchDealActivities } = useActivity();

  // Router params => if these exist, user is visiting a live deal
  const { creatorName, dealId } = useParams();
  const [searchParams] = useSearchParams();
  const sharerName = searchParams.get("sharer");

  // Onboarding / CardForm / SaveSheet / ProfileSheet states
  const [localUserId, setLocalUserId] = useState(null);
  const userOnboarded = !!localUserId;

  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  // NEW: keep profile sheet
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  const [cardFormData, setCardFormData] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);

  // Deal info
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [creatorUser, setCreatorUser] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  // ─────────────────────────────────────────
  // 1) Fetch existing deal
  // ─────────────────────────────────────────
  useEffect(() => {
    const fetchDeal = async () => {
      if (!creatorName || !dealId) {
        // There's no deal to fetch => base mode
        setLoading(false);
        setDealFound(false);
        return;
      }
      const decodedName = decodeURIComponent(creatorName).toLowerCase().trim();
      const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
      const shareURL = `${baseUrl}/share/${decodedName}/${dealId}`;

      const { data: dealRow, error } = await supabase
        .from("deals")
        .select("*")
        .eq("share_link", shareURL)
        .single();

      if (error || !dealRow) {
        setDealFound(false);
        setLoading(false);
        return;
      }
      setFetchedDeal(dealRow);
      setDealFound(true);
      setLoading(false);
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
        }
      }
    };
    fetchDeal();
  }, [creatorName, dealId]);

  // ─────────────────────────────────────────
  // 2) Sync to cardData
  // ─────────────────────────────────────────
  useEffect(() => {
    if (fetchedDeal) {
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

  // 2b) Once we have the creatorUser, set card’s name & photo
  useEffect(() => {
    if (creatorUser) {
      setCardData((prev) => ({
        ...prev,
        name: creatorUser.name,
        profilePhoto: creatorUser.profile_image_url,
      }));
    }
  }, [creatorUser, setCardData]);

  // 2c) fetchDealActivities
  useEffect(() => {
    if (currentDealId) {
      fetchDealActivities(currentDealId);
    }
  }, [currentDealId, fetchDealActivities]);

  // ─────────────────────────────────────────
  // Onboarding + Save logic
  // ─────────────────────────────────────────
  const handleSave = async () => {
    // If user is not onboarded, show the onboarding form first
    if (!userOnboarded) {
      setShowOnboardingForm(true);
    } else {
      // If user is onboarded, show the SaveSheet overlay
      setShowSaveSheet(true);
    }
  };

  const handleOnboardingComplete = async (userData) => {
    // Upsert user to supabase
    const user = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto,
    });
    setLocalUserId(user.id);
    setShowOnboardingForm(false);

    // Now show the SaveSheet overlay if that was the action
    setShowSaveSheet(true);
  };

  // finalize or log "save" after SaveSheet closes
  const finalizeSave = async () => {
    if (!cardData.id) {
      return; // No deal to save
    }
    try {
      // ensure user is saved
      const user = await upsertUser({
        phone_number: cardData.phone,
        name: cardData.name,
        profile_image_url: cardData.profilePhoto,
      });
      setLocalUserId(user.id);

      // log "claimed gift card" => treat "save" the same as "claim"
      await addActivity({
        userId: user.id,
        action: "claimed gift card",
        dealId: cardData.id,
      });
      alert("Gift card saved to your wallet!");
    } catch (err) {
      console.error("[TheRealDeal] finalizeSave =>", err);
      alert("Error saving deal.");
    }
  };

  // handleOpenCardForm => creating or editing a deal
  const handleOpenCardForm = () => {
    if (!userOnboarded) {
      setShowOnboardingForm(true);
      return;
    }
    // only allow editing if you're the creator
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

  // handleSaveCard => local preview in cardData
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

  // ─────────────────────────────────────────
  // ProfileSheet => show/hide logic
  // If you want to let user tap on the card's profile image to open it,
  // you can pass a callback to Card or to Buttons, etc.
  // We'll do a quick approach here:
  const handleProfileClick = () => {
    // If user is not onboarded, maybe ignore or show onboarding
    if (!userOnboarded) {
      return;
    }
    setShowProfileSheet(true);
  };

  // Loading / Not found states
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

  // Normal UI
  return (
    <MainContainer>
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col px-4 py-4 items-center overflow-hidden">
          <Card 
            onOpenCardForm={handleOpenCardForm}
            // For example, if you want the profile image to be clickable:
            onProfileClick={handleProfileClick} 
          />
          <div className="w-full max-w-[768px] flex flex-col mt-4 h-full">
            <Buttons onSave={handleSave} />
            <ActivityLog dealId={cardData.id || currentDealId} />
          </div>
        </div>
        <Footer />
      </div>

      {/* Floating Add Button => only for creating or editing deals */}
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

      {showSaveSheet && (
        <div className="absolute inset-0 z-50">
          <SaveSheet
            onClose={() => {
              setShowSaveSheet(false);
              finalizeSave();
            }}
          />
        </div>
      )}

      {showProfileSheet && (
        <div className="absolute inset-0 z-50">
          <ProfileSheet onClose={() => setShowProfileSheet(false)} />
        </div>
      )}
    </MainContainer>
  );
}

export default TheRealDeal;
