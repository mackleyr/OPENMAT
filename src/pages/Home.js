// src/pages/Home.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCard } from "../contexts/CardContext";
import { useLocalUser } from "../contexts/LocalUserContext";
import { useActivity } from "../contexts/ActivityContext";

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
import "../index.css"; // Important for your Tailwind or other global styles

import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";

function Home() {
  const { cardData, setCardData } = useCard();
  const { localUser, setLocalUser } = useLocalUser();
  const { addActivity, fetchDealActivities } = useActivity();

  // Route params for /share/<creatorName>/<dealId>
  const { creatorName, dealId } = useParams();

  // Overlays
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // We'll store a callback if user must onboard first
  const [pendingAction, setPendingAction] = useState(null);

  // Deal states
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  /* ---------------------------------------------------------
   *  1) Fetch Deal from share_link if /share/<creatorName>/<dealId>
   * --------------------------------------------------------- */
  const fetchDeal = async (shareLink) => {
    try {
      const { data: dealRow, error } = await supabase
        .from("deals")
        .select(
          `
            *,
            users!deals_creator_id_fkey (
              id,
              name,
              profile_image_url,
              paypal_email
            )
          `
        )
        .eq("share_link", shareLink)
        .single();

      if (error || !dealRow) {
        setDealFound(false);
        setLoading(false);
        return;
      }

      const { id, title, background, deal_value, share_link, description, users } = dealRow;
      const normalizedDeal = {
        id,
        title,
        image: background,
        value: deal_value,
        description,
        share_link,
        creatorId: users?.id || null,
        creatorName: users?.name || "",
        creatorPhoto: users?.profile_image_url || null,
        creatorPayPalEmail: users?.paypal_email || "",
      };
      setFetchedDeal(normalizedDeal);
      setDealFound(true);
    } catch (err) {
      console.error("fetchDeal error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
   *  2) If we already know deal ID => refetch (after create/update)
   * --------------------------------------------------------- */
  const refetchDealById = useCallback(async (idArg) => {
    if (!idArg) return;
    try {
      const { data: dealRow, error } = await supabase
        .from("deals")
        .select(
          `
            *,
            users!deals_creator_id_fkey (
              id,
              name,
              profile_image_url,
              paypal_email
            )
          `
        )
        .eq("id", idArg)
        .single();

      if (error || !dealRow) {
        setDealFound(false);
        return;
      }

      const { id, title, background, deal_value, description, share_link, users } = dealRow;
      const normalizedDeal = {
        id,
        title,
        image: background,
        value: deal_value,
        description,
        share_link,
        creatorId: users?.id || null,
        creatorName: users?.name || "",
        creatorPhoto: users?.profile_image_url || null,
        creatorPayPalEmail: users?.paypal_email || "",
      };
      setFetchedDeal(normalizedDeal);
      setDealFound(true);
    } catch (err) {
      console.error("refetchDealById error:", err);
    }
  }, []);

  /* ---------------------------------------------------------
   *  3) On mount => if we have /share/<creatorName>/<dealId>
   * --------------------------------------------------------- */
  useEffect(() => {
    if (!creatorName || !dealId) {
      setLoading(false);
      setDealFound(false);
      return;
    }
    const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
    const shareURL = `${baseUrl}/share/${creatorName}/${dealId}`;
    fetchDeal(shareURL);
  }, [creatorName, dealId]);

  /* ---------------------------------------------------------
   *  4) Once we have fetchedDeal => store in CardContext
   * --------------------------------------------------------- */
  useEffect(() => {
    if (!fetchedDeal) {
      setCurrentDealId(null);
      return;
    }
    if (cardData.id === fetchedDeal.id) return; // skip re-setting if same
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
  }, [fetchedDeal, cardData.id, setCardData]);

  // Once we have currentDealId => fetch activities
  useEffect(() => {
    if (currentDealId) {
      fetchDealActivities(currentDealId);
    }
  }, [currentDealId, fetchDealActivities]);

  /* ---------------------------------------------------------
   *  5) "withOnboardCheck" => if not onboard => show form;
   *      else run the callback
   * --------------------------------------------------------- */
  const withOnboardCheck = (actionFn) => {
    if (!localUser.id) {
      setPendingAction(() => actionFn);
      setShowOnboardingForm(true);
    } else {
      actionFn();
    }
  };

  /* ---------------------------------------------------------
   *  6) Onboarding complete => store user => run pendingAction if any
   * --------------------------------------------------------- */
  const handleOnboardingComplete = async (userData) => {
    console.log("[Home] => handleOnboardingComplete => userData =>", userData);
    try {
      const user = await upsertUser({
        paypal_email: userData.paypalEmail,
        name: userData.name,
        profile_image_url: userData.profilePhoto,
      });

      setLocalUser({
        id: user.id,
        paypalEmail: user.paypal_email,
        name: user.name || "",
        profilePhoto: user.profile_image_url || "",
      });
      setShowOnboardingForm(false);

      if (typeof pendingAction === "function") {
        pendingAction();
        setPendingAction(null);
        return;
      }

      // If new user & no deal => open CardForm
      if (!dealFound) {
        setCardData((prev) => ({
          ...prev,
          creatorId: user.id,
          name: user.name,
          profilePhoto: user.profile_image_url,
        }));
        setShowCardForm(true);
        return;
      }

      // If there's a deal => do nothing extra
    } catch (err) {
      console.error("[Home] => handleOnboardingComplete => error =>", err);
      alert("Error onboarding user.");
    }
  };

  /* ---------------------------------------------------------
   *  7) Action Handlers: CardTap, AddButton, Grab, etc.
   * --------------------------------------------------------- */

  // (A) Tapping the Card
  const handleCardTap = () => {
    withOnboardCheck(() => {
      // If a deal & user is the creator => open CardForm
      // else => SaveSheet
      if (dealFound && cardData.creatorId === localUser.id) {
        openCardForm();
      } else {
        setShowSaveSheet(true);
      }
    });
  };

  const openCardForm = () => {
    // If there's an existing deal & user is NOT the creator => block
    if (dealFound && cardData.creatorId !== localUser.id) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }
    setShowCardForm(true);
  };

  // (B) The "+" Add Button
  const handleOpenCardForm = () => {
    withOnboardCheck(() => {
      // If user wants to create a fresh deal or edit if no deal
      openCardForm();
    });
  };

  // (C) "Grab" => if cost>0 => Payment, else => SaveSheet
  const handleSave = () => {
    withOnboardCheck(() => {
      if (parseFloat(cardData.value) > 0 && cardData.creatorId !== localUser.id) {
        setShowPayment(true);
      } else {
        setShowSaveSheet(true);
      }
    });
  };

  // Called after the user closes SaveSheet => logs "grabbed gift card"
  const finalizeSave = async () => {
    if (!cardData.id || !localUser.id) return;
    try {
      const freshUser = await upsertUser({
        paypal_email: localUser.paypalEmail,
        name: localUser.name,
        profile_image_url: localUser.profilePhoto,
      });
      await addActivity({
        userId: freshUser.id,
        dealId: cardData.id,
        action: "grabbed gift card",
      });
      alert("Gift card saved!");
    } catch (err) {
      console.error("[Home] => finalizeSave => error =>", err);
      alert("Error saving deal.");
    }
  };

  // After user saves/updates card in CardForm
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
      share_link: formData.share_link || prev.share_link,
    }));
    setCurrentDealId(formData.id);
    setShowCardForm(false);
    await refetchDealById(formData.id);
  };

  // Tapping the user’s avatar
  const handleProfileClick = () => {
    withOnboardCheck(() => {
      setShowProfileSheet(true);
    });
  };

  /* ---------------------------------------------------------
   *  8) Rendering & UI
   * --------------------------------------------------------- */
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
      {/* Outer container with your usual flex layout & black background */}
      <div className="flex flex-col h-full bg-black text-white">
        <div className="flex-1 flex flex-col px-4 py-4 items-center overflow-hidden">
          <Card onCardTap={handleCardTap} onProfileClick={handleProfileClick} />
          <div className="w-full max-w-[768px] flex flex-col mt-4 h-full">
            {/* “Buttons” component => “onSave” might be renamed “onGrab,” etc. */}
            <Buttons onSave={handleSave} />
            <ActivityLog dealId={cardData.id || currentDealId} />
          </div>
        </div>
        <Footer />
      </div>

      {/* Floating + Button => open card form */}
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

      {showPayment && !showOnboardingForm && (
        <Payment
          onClose={() => {
            setShowPayment(false);
            setShowSaveSheet(true);
          }}
          dealData={{ ...cardData }}
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

export default Home;
