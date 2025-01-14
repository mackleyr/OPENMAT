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

import { supabase } from "../supabaseClient";
import { upsertUser } from "../services/usersService";

/**
 * Logic / Rules Recap:
 * 
 * 1. Card Tap:
 *    - If no deal => after onboarding => open CardForm.
 *    - If a deal => after onboarding => open SaveSheet.
 * 
 * 2. Add Button:
 *    - If no deal => after onboarding => open CardForm.
 *    - If a deal => after onboarding => also CardForm (fresh creation or edit).
 * 
 * 3. Copy Link:
 *    - If deal => copy link immediately (no onboarding).
 *    - If no deal => disabled button.
 * 
 * 4. Grab:
 *    - If no deal => disabled button.
 *    - If deal & user is the creator => cannot grab.
 *    - If deal & user is not the creator => after onboarding => pay if value>0, else SaveSheet.
 * 
 * 5. Editing:
 *    - If user tries to edit but is not the creator => block.
 */
function Home() {
  const { cardData, setCardData } = useCard();
  const { localUser, setLocalUser } = useLocalUser();
  const { addActivity, fetchDealActivities } = useActivity();

  // For shared links: /share/<creatorName>/<dealId>
  const { creatorName, dealId } = useParams();

  // Overlays
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // We store a callback in state if user must onboard first
  const [pendingAction, setPendingAction] = useState(null);

  // Deal states
  const [loading, setLoading] = useState(true);
  const [dealFound, setDealFound] = useState(false);
  const [fetchedDeal, setFetchedDeal] = useState(null);
  const [currentDealId, setCurrentDealId] = useState(null);

  /* ------------------------------------------------------------------
   *  1) Fetch a deal from share_link if we have /share/<creatorName>/<dealId>
   * ------------------------------------------------------------------ */
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

  // If we know the deal ID => refetch by ID (used after create/update)
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

  // On mount => if we have a share link => fetch
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

  // Once we have fetchedDeal => store in CardContext
  useEffect(() => {
    if (!fetchedDeal) {
      setCurrentDealId(null);
      return;
    }
    if (cardData.id === fetchedDeal.id) return; // skip re‐setting if same
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

  /* ------------------------------------------------------------------
   *  2) "withOnboardCheck" => if user is not onboarded => show form;
   *      otherwise => run the callback
   * ------------------------------------------------------------------ */
  const withOnboardCheck = (actionFn) => {
    if (!localUser.id) {
      setPendingAction(() => actionFn);
      setShowOnboardingForm(true);
    } else {
      actionFn();
    }
  };

  /* ------------------------------------------------------------------
   *  3) Onboarding complete => upsert user => if pendingAction => run it
   *      else if no deal => open CardForm
   * ------------------------------------------------------------------ */
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

      // If brand new user => no deal => open CardForm
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
      // If there's an existing deal => do nothing special
    } catch (err) {
      console.error("[Home] => handleOnboardingComplete => error =>", err);
      alert("Error onboarding user.");
    }
  };

  /* ------------------------------------------------------------------
   *  4) Action Handlers (Card Tap, Add Button, Copy Link, Grab)
   * ------------------------------------------------------------------ */

  // (A) Card Tap
  const handleCardTap = () => {
    withOnboardCheck(() => {
      if (!dealFound) {
        // No deal => after onboarding => CardForm
        setShowCardForm(true);
      } else {
        // If a deal => open SaveSheet
        setShowSaveSheet(true);
      }
    });
  };

  // (B) Add Button
  const handleAddDeal = () => {
    withOnboardCheck(() => {
      // If no deal => open CardForm
      // If a deal => also open CardForm (fresh creation or edit)
      setShowCardForm(true);
    });
  };

  // (C) Copy Link
  const handleCopyLink = () => {
    if (!dealFound) {
      // No deal => button is disabled (UI side)
      return;
    }
    // We don't require onboard for link copying
    if (cardData.share_link) {
      navigator.clipboard.writeText(cardData.share_link);
      alert("Deal link copied!");
    }
  };

  // (D) Grab
  const handleGrab = () => {
    if (!dealFound) return; // disabled button if no deal
    // If user is the creator => can't grab
    if (localUser.id && localUser.id === cardData.creatorId) {
      alert("You can't grab your own deal.");
      return;
    }
    // Otherwise => onboard => pay or save
    withOnboardCheck(() => {
      const cost = parseFloat(cardData.value || "0");
      if (cost > 0) {
        setShowPayment(true);
      } else {
        setShowSaveSheet(true);
      }
    });
  };

  /* ------------------------------------------------------------------
   *  5) finalizeSave => logs "grabbed" (only after SaveSheet)
   * ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
   *  6) Save/Update Card => after CardForm
   * ------------------------------------------------------------------ */
  const handleSaveCard = async (formData) => {
    // If user tries to edit but is not creator => block
    if (dealFound && cardData.creatorId && cardData.creatorId !== localUser.id) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }

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
    setShowCardForm(false);
    setCurrentDealId(formData.id);
    await refetchDealById(formData.id);
  };

  // Tapping the user’s profile => onboard => open ProfileSheet
  const handleProfileClick = () => {
    withOnboardCheck(() => {
      setShowProfileSheet(true);
    });
  };

  /* ------------------------------------------------------------------
   *  7) Rendering
   * ------------------------------------------------------------------ */
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
            <Buttons 
              onSave={handleGrab}
              onCopyLink={handleCopyLink}
            />
            <ActivityLog dealId={cardData.id || currentDealId} />
          </div>
        </div>
        <Footer />
      </div>

      {/* Floating + Button => create/edit deal */}
      <AddButton onOpenCardForm={handleAddDeal} />

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
          dealData={cardData}
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
