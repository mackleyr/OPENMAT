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
import Payment from "../components/Payment";
import "../index.css";

import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";
import { useActivity } from "../contexts/ActivityContext";

function TheRealDeal() {
  const { cardData, setCardData } = useCard();
  const { localUser, setLocalUser } = useLocalUser();
  const { addActivity, fetchDealActivities } = useActivity();

  // "shared mode" if these exist:
  const { creatorName, dealId } = useParams();

  // Overlays
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Next step after onboarding
  const [postOnboardingAction, setPostOnboardingAction] = useState(null);

  // Deal fetch states
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  const fetchDeal = async (shareLink) => {
    console.log("[fetchDeal] => shareLink:", shareLink);
    const { data: dealRow, error } = await supabase
      .from("deals")
      .select(
        `
          *,
          users!deals_creator_id_fkey (
            name,
            profile_image_url,
            paypal_email
          )
        `
      )
      .eq("share_link", shareLink)
      .single();

    console.log("[fetchDeal] => dealRow:", dealRow, "error:", error);

    if (error || !dealRow) {
      console.error("[fetchDeal] Error fetching deal:", error);
      setDealFound(false);
      setLoading(false);
      return;
    }

    const { name, profile_image_url: profilePhoto, paypal_email } = dealRow.users || {};
    setFetchedDeal({
      ...dealRow,
      creatorName: name,
      creatorPhoto: profilePhoto,
      creatorPayPalEmail: paypal_email,
    });
    setDealFound(true);
    setLoading(false);
  };

  const refetchDealById = async (dealId) => {
    console.log("[refetchDealById] => dealId:", dealId);
    if (!dealId) {
      console.warn("[refetchDealById] No dealId provided");
      return;
    }

    try {
      const { data: dealRow, error } = await supabase
        .from("deals")
        .select(
          `
            id,
            title,
            deal_value,
            description,
            background,
            share_link,
            users!deals_creator_id_fkey (
              id,
              name,
              profile_image_url,
              paypal_email
            )
          `
        )
        .eq("id", dealId)
        .single();

      console.log("[refetchDealById] => dealRow:", dealRow, "error:", error);
      if (error) {
        console.error("[refetchDealById] Error:", error.message);
        setDealFound(false);
        return;
      }
      if (!dealRow) {
        console.warn("[refetchDealById] No deal found with ID:", dealId);
        setDealFound(false);
        return;
      }

      const normalizedDeal = {
        id: dealRow.id,
        title: dealRow.title,
        value: dealRow.deal_value,
        description: dealRow.description,
        image: dealRow.background,
        share_link: dealRow.share_link,
        creatorId: dealRow.users?.id || null,
        creatorName: dealRow.users?.name || "Anonymous",
        creatorPhoto: dealRow.users?.profile_image_url || null,
        creatorPayPalEmail: dealRow.users?.paypal_email || null,
      };
      console.log("[refetchDealById] => normalizedDeal =>", normalizedDeal);

      setFetchedDeal(normalizedDeal);
      setDealFound(true);
    } catch (err) {
      console.error("[refetchDealById] Unexpected error:", err);
      setDealFound(false);
    }
  };

  // On mount, if we have creatorName + dealId => shared mode. Attempt to fetch.
  useEffect(() => {
    const fetchData = async () => {
      if (!creatorName || !dealId) {
        console.log("[TheRealDeal] => base mode, no shared link");
        setLoading(false);
        setDealFound(false);
        return;
      }

      const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
      const shareURL = `${baseUrl}/share/${creatorName}/${dealId}`;
      console.log("[TheRealDeal] => shareURL to fetch =>", shareURL);
      await fetchDeal(shareURL);
    };
    fetchData();
  }, [creatorName, dealId]);

  // When we get a fetchedDeal => put it into cardData if not already loaded
  useEffect(() => {
    if (!fetchedDeal) {
      setCurrentDealId(null);
      return;
    }

    if (cardData.id === fetchedDeal.id) {
      console.log("[TheRealDeal] => cardData already matches fetchedDeal.id:", fetchedDeal.id);
      return;
    }

    console.log("[TheRealDeal] => setting cardData from fetchedDeal =>", fetchedDeal);

    setCardData((prev) => ({
      ...prev,
      id: fetchedDeal.id,
      creatorId: fetchedDeal.creatorId,
      name: fetchedDeal.creatorName,
      profilePhoto: fetchedDeal.creatorPhoto,
      title: fetchedDeal.title,
      value: fetchedDeal.value,
      image: fetchedDeal.image,
      share_link: fetchedDeal.share_link,
      description: fetchedDeal.description,
    }));
    setCurrentDealId(fetchedDeal.id);
  }, [fetchedDeal, setCardData, cardData.id]);

  // Once we know the current deal's ID => fetch its activities
  useEffect(() => {
    if (currentDealId) {
      console.log("[TheRealDeal] => fetchDealActivities for dealId =", currentDealId);
      fetchDealActivities(currentDealId);
    }
  }, [currentDealId, fetchDealActivities]);

  // If user taps the card, either edit (if owner) or grab (visitor)
  const handleCardTap = () => {
    console.log("[TheRealDeal] => handleCardTap => localUser.id:", localUser.id);
    if (!localUser.id) {
      setPostOnboardingAction("COUPON_TAP");
      setShowOnboardingForm(true);
      return;
    }
    openCreatorOrSave();
  };

  const openCreatorOrSave = () => {
    console.log("[TheRealDeal] => openCreatorOrSave => cardData.creatorId:", cardData.creatorId, " localUser.id:", localUser.id);
    if (dealFound && cardData.creatorId === localUser.id) {
      openCardForm();
    } else {
      setShowSaveSheet(true);
    }
  };

  const handleOpenCardForm = () => {
    console.log("[TheRealDeal] => handleOpenCardForm => localUser.id:", localUser.id);
    if (!localUser.id) {
      setPostOnboardingAction("CARD_FORM");
      setShowOnboardingForm(true);
    } else {
      openCardForm();
    }
  };

  const openCardForm = () => {
    console.log("[TheRealDeal] => openCardForm => check if user is creator => cardData.creatorId:", cardData.creatorId);
    if (dealFound && cardData.creatorId !== localUser.id) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }
    setShowCardForm(true);
  };

  const handleOnboardingComplete = async (userData) => {
    console.log("[TheRealDeal] => handleOnboardingComplete => userData:", userData);

    const user = await upsertUser({
      phone_number: userData.phone,
      name: userData.name,
      profile_image_url: userData.profilePhoto,
    });
    console.log("[TheRealDeal] => upsertUser returned =>", user);

    // Update localUser
    setLocalUser((prev) => ({
      ...prev,
      id: user.id,
      phone: user.phone_number,
      name: user.name,
      profilePhoto: user.profile_image_url,
      paypalEmail: user.paypal_email || "",
    }));

    setShowOnboardingForm(false);

    if (!dealFound) {
      console.log("[TheRealDeal] => base mode => new user is creator => openCardForm()");
      setCardData((prevCardData) => ({
        ...prevCardData,
        creatorId: user.id,
        name: user.name,
        profilePhoto: user.profile_image_url,
      }));
      openCardForm();
      return;
    }

    // shared mode
    if (cardData.creatorId === user.id) {
      console.log("[TheRealDeal] => user actually owns this deal => openCardForm if needed => postOnboardingAction:", postOnboardingAction);
      if (postOnboardingAction === "CARD_FORM" || postOnboardingAction === "COUPON_TAP") {
        openCardForm();
      }
    } else {
      // user is visitor
      console.log("[TheRealDeal] => user is visitor => postOnboardingAction:", postOnboardingAction);
      if (postOnboardingAction === "COUPON_TAP" || postOnboardingAction === "SAVE_SHEET") {
        setShowSaveSheet(true);
      }
    }
  };

  // "Grab" => triggers Payment if the card has a cost, else the SaveSheet
  const handleSave = () => {
    console.log("[TheRealDeal] => handleSave => localUser.id:", localUser.id, " cardData.value:", cardData.value);
    if (!localUser.id) {
      setPostOnboardingAction("SAVE_SHEET");
      setShowOnboardingForm(true);
      return;
    }

    // If the deal has a price > 0 and user != creator => pop Payment overlay
    if (cardData.value > 0 && cardData.creatorId !== localUser.id) {
      console.log("[TheRealDeal] => showPayment => user is not creator, price > 0 => Payment overlay");
      setShowPayment(true);
    } else {
      console.log("[TheRealDeal] => showSaveSheet => either price=0 or user is creator");
      setShowSaveSheet(true);
    }
  };

  // finalizeSave => logs "grabbed" activity
  const finalizeSave = async () => {
    console.log("[TheRealDeal] => finalizeSave => cardData.id:", cardData.id, " localUser.id:", localUser.id);
    if (!cardData.id || !localUser.id) return;

    try {
      const freshUser = await upsertUser({
        phone_number: localUser.phone,
        name: localUser.name,
        profile_image_url: localUser.profilePhoto,
      });
      console.log("[TheRealDeal] => finalizeSave => freshUser =>", freshUser);

      await addActivity({
        userId: freshUser.id,
        dealId: cardData.id,
        action: "grabbed gift card",
      });

      alert("Gift card saved to your wallet!");
    } catch (err) {
      console.error("[TheRealDeal] => finalizeSave => error =>", err);
      alert("Error saving deal.");
    }
  };

  // user saved/updated card in CardForm
  const handleSaveCard = async (formData) => {
    console.log("[TheRealDeal] => handleSaveCard => formData =>", formData);
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
      share_link: formData.share_link || prev.share_link,
    }));
    setCurrentDealId(formData.id);
    setShowCardForm(false);

    await refetchDealById(formData.id);
  };

  const handleProfileClick = () => {
    console.log("[TheRealDeal] => handleProfileClick => localUser.id:", localUser.id);
    if (!localUser.id) return;
    setShowProfileSheet(true);
  };

  // Render states
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

  console.log("[TheRealDeal] => final cardData in render =>", cardData);

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
            cardData={cardData}
          />
        </div>
      )}

      {/* Payment Overlay */}
      {showPayment && !showOnboardingForm && (
        <Payment
          onClose={() => {
            setShowPayment(false);
            // after successful payment, automatically open save sheet
            setShowSaveSheet(true);
          }}
          dealData={{
            ...cardData,
            creatorPayPalEmail: fetchedDeal?.creatorPayPalEmail,
          }}
        />
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
