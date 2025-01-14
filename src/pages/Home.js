// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Contexts
import { useCard } from "../contexts/CardContext";
import { useLocalUser } from "../contexts/LocalUserContext";
import { useActivity } from "../contexts/ActivityContext";

// Hooks & Services
import { useFetchDeal } from "../hooks/useFetchDeal";
import { upsertUser } from "../services/usersService";

// Components
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

function Home() {
  const { cardData, setCardData } = useCard();
  const { localUser, setLocalUser } = useLocalUser();
  const { addActivity, fetchDealActivities } = useActivity();

  const { creatorName, dealId } = useParams();

  // Overlay states
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // If we must onboard first, store a "pending action"
  const [pendingAction, setPendingAction] = useState(null);

  // Build share URL if we got /share/<creatorName>/<dealId>
  const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
  const shareURL = creatorName && dealId
    ? `${baseUrl}/share/${creatorName}/${dealId}`
    : null;

  // 1) Use our custom hook to load a deal
  const {
    deal: fetchedDeal,
    loading,
    error,
    fetchDeal,
  } = useFetchDeal({ initialShareLink: shareURL });

  // 2) Store new fetchedDeal in CardContext & fetch activities
  useEffect(() => {
    if (fetchedDeal) {
      // Skip if cardData is already the same deal
      if (cardData.id === fetchedDeal.id) return;

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

      fetchDealActivities(fetchedDeal.id);
    } else {
      // If no fetchedDeal, optionally reset our CardContext
      setCardData((prev) => ({
        ...prev,
        id: null,
        title: "",
        value: "0",
        image: null,
        description: "",
      }));
    }
  }, [fetchedDeal, cardData.id, setCardData, fetchDealActivities]);

  /* ------------------------------------------------------------------
   *  Onboarding Flow => withOnboardCheck
   * ------------------------------------------------------------------ */
  const withOnboardCheck = (actionFn) => {
    if (!localUser.id) {
      setPendingAction(() => actionFn);
      setShowOnboardingForm(true);
    } else {
      actionFn();
    }
  };

  const handleOnboardingComplete = async (userData) => {
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

      // If brand new user => open the CardForm only if there's no fetchedDeal
      if (!fetchedDeal && !error) {
        setCardData((prev) => ({
          ...prev,
          creatorId: user.id,
          name: user.name,
          profilePhoto: user.profile_image_url,
        }));
        setShowCardForm(true);
      }
    } catch (err) {
      console.error("[Home] => handleOnboardingComplete => error =>", err);
      alert("Error onboarding user.");
    }
  };

  /* ------------------------------------------------------------------
   *  Tapping the Card
   * ------------------------------------------------------------------ */
  const handleCardTap = () => {
    withOnboardCheck(() => {
      // If no deal => open CardForm for new
      if (!cardData.id) {
        setShowCardForm(true);
        return;
      }

      // If deal => is the user the creator?
      const isCreator = cardData.creatorId === localUser.id;
      if (isCreator) {
        openCardForm();
      } else {
        // Not creator => Payment => SaveSheet if value>0, else SaveSheet
        if (parseFloat(cardData.value) > 0) {
          setShowPayment(true);
        } else {
          setShowSaveSheet(true);
        }
      }
    });
  };

  const openCardForm = () => {
    // If there's a deal & user is NOT the creator => block editing
    if (cardData.id && cardData.creatorId !== localUser.id) {
      alert("You cannot edit a deal you didn't create.");
      return;
    }
    setShowCardForm(true);
  };

  // The "+" button => open card form
  const handleOpenCardForm = () => {
    withOnboardCheck(() => {
      openCardForm();
    });
  };

  // "Grab" => if cost>0 => Payment, else => SaveSheet
  const handleSave = () => {
    withOnboardCheck(() => {
      if (parseFloat(cardData.value) > 0 && cardData.creatorId !== localUser.id) {
        setShowPayment(true);
      } else {
        setShowSaveSheet(true);
      }
    });
  };

  // finalize => log "grabbed gift card"
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

  // after user saves/updates card in CardForm
  const handleSaveCard = async (formData) => {
    // 1) Upsert the user with new changes
    try {
      const updatedUser = await upsertUser({
        paypal_email: formData.userPayPalEmail,
        name: formData.userName,
        profile_image_url: formData.userProfilePhoto,
      });
      setLocalUser({
        id: updatedUser.id,
        paypalEmail: updatedUser.paypal_email,
        name: updatedUser.name || "",
        profilePhoto: updatedUser.profile_image_url || "",
      });
    } catch (err) {
      console.error("[Home] => handleSaveCard => UpsertUser => error =>", err);
      alert("Error updating your user data.");
    }

    // 2) Update CardContext with the deal fields
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      creatorId: localUser.id,
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      description: formData.dealDescription,
      name: formData.userName,
      profilePhoto: formData.userProfilePhoto,
      share_link: formData.share_link || prev.share_link,
    }));

    // close form
    setShowCardForm(false);

    // re-fetch from DB
    await fetchDeal({ dealId: formData.id });
  };

  // tapping user’s profile
  const handleProfileClick = () => {
    withOnboardCheck(() => {
      setShowProfileSheet(true);
    });
  };

  /* ------------------------------------------------------------------
   *  Render
   * ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Loading deal...</div>
      </div>
    );
  }

  // If we tried to load a share link & got an error or no deal => "Deal not found"
  const triedToLoadShareLink = creatorName && dealId;
  if (triedToLoadShareLink && (!fetchedDeal || error)) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Deal not found.</div>
      </div>
    );
  }

  return (
    <MainContainer className="relative w-full h-full flex flex-col items-center bg-white text-black">
      <div className="flex-1 flex flex-col px-4 py-4 items-center w-full max-w-[768px] overflow-hidden">
        <Card onCardTap={handleCardTap} onProfileClick={handleProfileClick} />
        <div className="w-full mt-4 h-full flex flex-col">
          <Buttons onSave={handleSave} />
          <ActivityLog dealId={cardData.id} />
        </div>
      </div>

      <Footer />

      {/* Floating + Button => open card form */}
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
            cardData={{
              ...cardData,
              userPayPalEmail: localUser.paypalEmail,
              userName: localUser.name,
              userProfilePhoto: localUser.profilePhoto,
            }}
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
