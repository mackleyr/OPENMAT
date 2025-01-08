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
  const { cardData, setCardData } = useCard();         // The active deal data
  const { localUser, setLocalUser } = useLocalUser();  // The visiting user
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

  // Data for CardForm
  const [cardFormData, setCardFormData] = useState(null);

  // Deal fetch state
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  /**
   * Possibly load an existing shared deal
   */
  useEffect(() => {
    const fetchDeal = async () => {
      console.log("[TheRealDeal] => Checking for existing deal...");
      if (!creatorName || !dealId) {
        // base mode => no external deal
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
        console.error("[TheRealDeal] => deal not found =>", error);
        setDealFound(false);
        setLoading(false);
        return;
      }

      console.log("[TheRealDeal] => Found existing deal =>", dealRow);
      setFetchedDeal(dealRow);
      setDealFound(true);
      setLoading(false);
      setCurrentDealId(dealRow.id);
    };
    fetchDeal();
  }, [creatorName, dealId]);

  /**
   * If we found a deal => store in cardData => fetch activity
   */
  useEffect(() => {
    if (!fetchedDeal) {
      console.log("[TheRealDeal] => no fetchedDeal => base mode => clearing currentDealId.");
      setCurrentDealId(null);
      return;
    }

    console.log("[TheRealDeal] => Syncing fetchedDeal => cardData =>", fetchedDeal);
    setCardData((prev) => ({
      ...prev,
      id: fetchedDeal.id,
      creatorId: fetchedDeal.creator_id || null,
      title: fetchedDeal.title || "",
      value: fetchedDeal.deal_value || "",
      image: fetchedDeal.background || "",
      share_link: fetchedDeal.share_link || "",
      description: fetchedDeal.description || ""
    }));
    setCurrentDealId(fetchedDeal.id);
  }, [fetchedDeal, setCardData]);

  /**
   * If valid deal => fetch activities
   */
  useEffect(() => {
    if (currentDealId) {
      console.log("[TheRealDeal] => fetchDealActivities =>", currentDealId);
      fetchDealActivities(currentDealId);
    }
  }, [currentDealId, fetchDealActivities]);

  /**
   * Tapping the coupon => either open "creator" flow or "claim" flow
   * We assume user is onboarded, or we show Onboarding if localUser.id is missing
   */
  const handleCardTap = () => {
    console.log("[TheRealDeal] => handleCardTap => localUser.id?", localUser.id);
    if (!localUser.id) {
      // Not onboarded => open onboarding
      setPostOnboardingAction("COUPON_TAP");
      setShowOnboardingForm(true);
      return;
    }
    // else do next
    openCreatorOrSave();
  };

  const openCreatorOrSave = () => {
    if (dealFound && cardData.creatorId === localUser.id) {
      // user is the creator => open card form
      openCardForm();
    } else {
      // else "claim"
      setShowSaveSheet(true);
    }
  };

  /**
   * The (+) => create/edit => must be the creator, or brand-new user in base mode
   */
  const handleOpenCardForm = () => {
    console.log("[TheRealDeal] => handleOpenCardForm => localUser.id?", localUser.id);
    if (!localUser.id) {
      setPostOnboardingAction("CARD_FORM");
      setShowOnboardingForm(true);
    } else {
      openCardForm();
    }
  };

  /**
   * openCardForm => we skip userOnboarded check, assuming they are
   * but if we do want to guard, we can do it:
   */
  const openCardForm = () => {
    console.log("[TheRealDeal] => openCardForm => cardData =>", cardData);

    // If in shared mode & user is not the actual creator => block editing
    if (dealFound && cardData.creatorId !== localUser.id) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }

    // Prepare data for <CardForm>
    const initData = {
      id: cardData.id,                  // might be null if new
      dealValue: cardData.value,
      dealTitle: cardData.title,
      dealImage: cardData.image,
      name: localUser.name || "",        // "the user is the occupant of CardForm"
      profilePhoto: localUser.profilePhoto || "",
      localUserId: localUser.id
    };

    setCardFormData(initData);
    setShowCardForm(true);
  };

  /**
   * Onboarding => after complete => store localUser => if base => set as creator
   * Then open card form
   */
  const handleOnboardingComplete = async (userData) => {
    console.log("[TheRealDeal] => handleOnboardingComplete => userData =>", userData);

    // upsert local user
    const user = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto
    });
    console.log("[TheRealDeal] => upsertUser => returned user =>", user);

    // store in localUser
    setLocalUser({
      id: user.id,
      phone: user.phone_number,
      name: user.name,
      profilePhoto: user.profile_image_url
    });
    setShowOnboardingForm(false);

    console.log(
      "[TheRealDeal][handleOnboardingComplete] => dealFound?",
      dealFound,
      " => cardData.creatorId:",
      cardData.creatorId,
      " vs new user.id:",
      user.id
    );

    if (!dealFound) {
      // base mode => user is new creator
      console.log("[TheRealDeal][handleOnboardingComplete] => base mode => set cardData => new user as creator");
      setCardData((prev) => ({
        ...prev,
        creatorId: user.id
      }));

      // Now we open the card form
      openCardForm();
      return;
    }

    // If user is actual creator
    if (cardData.creatorId === user.id) {
      if (postOnboardingAction === "CARD_FORM" || postOnboardingAction === "COUPON_TAP") {
        openCardForm();
      }
    } else {
      // user is a visitor => claim
      if (postOnboardingAction === "COUPON_TAP" || postOnboardingAction === "SAVE_SHEET") {
        setShowSaveSheet(true);
      }
    }
  };

  /**
   * "Save" => open SaveSheet => if user not onboarded => prompt them
   */
  const handleSave = () => {
    console.log("[TheRealDeal] => handleSave => localUser.id?", localUser.id);
    if (!localUser.id) {
      setPostOnboardingAction("SAVE_SHEET");
      setShowOnboardingForm(true);
    } else {
      setShowSaveSheet(true);
    }
  };

  /**
   * finalizeSave => user claims => logs an activity
   */
  const finalizeSave = async () => {
    console.log("[TheRealDeal] => finalizeSave => cardData.id =>", cardData.id);
    if (!cardData.id) return;
    try {
      if (!localUser.id) return;

      console.log("[TheRealDeal] => finalizeSave => upserting localUser =>", localUser);
      const freshUser = await upsertUser({
        phone_number: localUser.phone,
        name: localUser.name,
        profile_image_url: localUser.profilePhoto
      });

      // log "claimed gift card"
      await addActivity({
        userId: freshUser.id,
        dealId: cardData.id,
        action: "claimed gift card"
      });

      alert("Gift card saved to your wallet!");
    } catch (err) {
      console.error("[TheRealDeal] => finalizeSave => error =>", err);
      alert("Error saving deal.");
    }
  };

  /**
   * CardForm => after "Complete" => merges data into cardData
   */
  const handleSaveCard = async (formData) => {
    console.log("[TheRealDeal] => handleSaveCard => formData =>", formData);

    // The user is definitely the creator
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      creatorId: localUser.id,
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      name: formData.name,
      profilePhoto: formData.profilePhoto
    }));
    setCurrentDealId(formData.id);
    setShowCardForm(false);
  };

  /**
   * tapping the profile => open ProfileSheet
   */
  const handleProfileClick = () => {
    if (!localUser.id) return;
    setShowProfileSheet(true);
  };

  /**
   * Render states
   */
  if (loading) {
    console.log("[TheRealDeal] => loading => 'Loading deal...'");
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Loading deal...</div>
      </div>
    );
  }
  if (creatorName && dealId && !dealFound) {
    console.log("[TheRealDeal] => shared => not found => 'Deal not found'");
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Deal not found.</div>
      </div>
    );
  }

  console.log("[TheRealDeal] => Normal => cardData =>", cardData);
  console.log("[TheRealDeal] => localUser =>", localUser);

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
