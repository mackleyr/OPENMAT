// src/pages/TheRealDeal.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCard } from "../contexts/CardContext";
import { useLocalUser } from "../contexts/LocalUserContext";
import MainContainer from "../components/MainContainer";
import Footer from "../components/Footer";
import Card from "../components/Card";
import Buttons from "../components/Buttons";
import ActivityLog from "../components/ActivityLog";
import AddButton from "../components/AddButton";
import CardForm from "../components/CardForm";
import OnboardingForm from "../components/OnboardingForm";
import ProfileSheet from "../components/ProfileSheet";
import SaveSheet from "../components/SaveSheet";
import "../index.css";

import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";
import { useActivity } from "../contexts/ActivityContext";

function TheRealDeal() {
  const { cardData, setCardData } = useCard();     // The single "active" deal
  const { localUser, setLocalUser } = useLocalUser(); // The visiting user
  const { addActivity, fetchDealActivities } = useActivity();

  // If these exist => "shared mode"
  const { creatorName, dealId } = useParams();

  // Overlays
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  // Next step after onboarding
  const [postOnboardingAction, setPostOnboardingAction] = useState(null);

  // CardForm
  const [cardFormData, setCardFormData] = useState(null);

  // Deal fetch states
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  // 1) Possibly load an existing shared deal
  useEffect(() => {
    const fetchDeal = async () => {
      if (!creatorName || !dealId) {
        // base mode
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
    };
    fetchDeal();
  }, [creatorName, dealId]);

  // 2) If fetched => store in cardData => fetch activity
  useEffect(() => {
    if (!fetchedDeal) {
      setCurrentDealId(null);
      return;
    }

    setCardData((prev) => ({
      ...prev,
      id: fetchedDeal.id,
      creatorId: fetchedDeal.creator_id || null,
      title: fetchedDeal.title || "",
      value: fetchedDeal.deal_value || "",
      image: fetchedDeal.background || "",
      share_link: fetchedDeal.share_link || "",
      description: fetchedDeal.description || "",
    }));
    setCurrentDealId(fetchedDeal.id);
  }, [fetchedDeal, setCardData]);

  // 2c) If valid => fetch activity
  useEffect(() => {
    if (currentDealId) {
      fetchDealActivities(currentDealId);
    }
  }, [currentDealId, fetchDealActivities]);

  // Tapping the card => open "creator" or "claim"
  const handleCardTap = () => {
    if (!localUser.id) {
      setPostOnboardingAction("COUPON_TAP");
      setShowOnboardingForm(true);
      return;
    }
    openCreatorOrSave();
  };

  const openCreatorOrSave = () => {
    if (dealFound && cardData.creatorId === localUser.id) {
      openCardForm();
    } else {
      setShowSaveSheet(true);
    }
  };

  // The (+)
  const handleOpenCardForm = () => {
    if (!localUser.id) {
      setPostOnboardingAction("CARD_FORM");
      setShowOnboardingForm(true);
    } else {
      openCardForm();
    }
  };

  // open card form, skipping onboard check
  const openCardForm = () => {
    if (dealFound && cardData.creatorId !== localUser.id) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }

    const initData = {
      id: cardData.id,
      dealValue: cardData.value,
      dealTitle: cardData.title,
      dealDescription: cardData.description || "",
      dealImage: cardData.image,
      name: localUser.name || "", 
      profilePhoto: localUser.profilePhoto || "",
      localUserId: localUser.id,
    };
    setCardFormData(initData);
    setShowCardForm(true);
  };

  // Onboarding => after complete => if base => set new user as creator
  const handleOnboardingComplete = async (userData) => {
    const user = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto,
    });

    setLocalUser({
      id: user.id,
      phone: user.phone_number,
      name: user.name,
      profilePhoto: user.profile_image_url,
    });
    setShowOnboardingForm(false);

    if (!dealFound) {
      // base mode => new creator
      setCardData((prev) => ({
        ...prev,
        creatorId: user.id,
        // also set name + photo so cardData includes new user data
        name: user.name,
        profilePhoto: user.profile_image_url,
      }));
      openCardForm();
      return;
    }

    if (cardData.creatorId === user.id) {
      if (postOnboardingAction === "CARD_FORM" || postOnboardingAction === "COUPON_TAP") {
        openCardForm();
      }
    } else {
      if (postOnboardingAction === "COUPON_TAP" || postOnboardingAction === "SAVE_SHEET") {
        setShowSaveSheet(true);
      }
    }
  };

  // "Save" => open SaveSheet => if not onboarded => prompt them
  const handleSave = () => {
    if (!localUser.id) {
      setPostOnboardingAction("SAVE_SHEET");
      setShowOnboardingForm(true);
    } else {
      setShowSaveSheet(true);
    }
  };

  // finalize => user claims => logs claim
  const finalizeSave = async () => {
    if (!cardData.id) return;
    if (!localUser.id) return;

    try {
      const freshUser = await upsertUser({
        phone_number: localUser.phone,
        name: localUser.name,
        profile_image_url: localUser.profilePhoto,
      });
      await addActivity({
        userId: freshUser.id,
        dealId: cardData.id,
        action: "claimed gift card",
      });
      alert("Gift card saved to your wallet!");
    } catch (err) {
      alert("Error saving deal.");
    }
  };

  // CardForm => after "Complete"
  const handleSaveCard = async (formData) => {
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      creatorId: localUser.id,
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      description: formData.dealDescription,
      name: formData.name,
      profilePhoto: formData.profilePhoto,
    }));
    setCurrentDealId(formData.id);
    setShowCardForm(false);

    // re-fetch final deal 
    await refetchDealById(formData.id);
  };

  // Tapping profile => open ProfileSheet
  const handleProfileClick = () => {
    if (!localUser.id) return;
    setShowProfileSheet(true);
  };

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

  return (
    <MainContainer>
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col px-4 py-4 items-center overflow-hidden">
          <Card onCardTap={handleCardTap} onProfileClick={handleProfileClick} />
          <div className="w-full max-w-[768px] flex flex-col mt-4 h-full">
            <Buttons onSave={handleSave} />
            <ActivityLog dealId={cardData.id || currentDealId} />
          </div>
        </div>
        <Footer />
      </div>

      {/* The floating (+) => create/edit */}
      <AddButton onOpenCardForm={handleOpenCardForm} />

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
            userData={localUser}
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
