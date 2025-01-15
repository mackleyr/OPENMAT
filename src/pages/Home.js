// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
import ProfileSheet from "../components/ProfileSheet";
import SaveSheet from "../components/SaveSheet";
import Payment from "../components/Payment";
import "../index.css";

function Home() {
  const navigate = useNavigate();

  // Global contexts
  const { cardData, setCardData } = useCard();
  const { localUser, setLocalUser } = useLocalUser();
  const { addActivity, fetchDealActivities } = useActivity();

  // URL path params => /share/<creatorName>/<dealId>
  const { creatorName, dealId } = useParams();

  // Overlay states
  const [showCardForm, setShowCardForm] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Decide the share URL
  const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
  const shareURL =
    creatorName && dealId ? `${baseUrl}/share/${creatorName}/${dealId}` : null;

  // 1) Load deal from Supabase (via our custom hook)
  const {
    deal: fetchedDeal,
    loading,
    error,
    fetchDeal,
  } = useFetchDeal({ initialShareLink: shareURL });

  // 2) After we get a fetchedDeal, store it in CardContext + fetch activities
  useEffect(() => {
    if (fetchedDeal) {
      // If same ID, skip
      if (cardData.id === fetchedDeal.id) return;

      setCardData({
        id: fetchedDeal.id,
        creatorId: fetchedDeal.creatorId,
        name: fetchedDeal.creatorName,
        profilePhoto: fetchedDeal.creatorPhoto,
        title: fetchedDeal.title,
        value: fetchedDeal.value,
        image: fetchedDeal.image,
        share_link: fetchedDeal.share_link,
        description: fetchedDeal.description,
      });

      fetchDealActivities(fetchedDeal.id);
    } else {
      // If no fetchedDeal, clear CardContext
      setCardData({
        id: null,
        creatorId: null,
        name: "",
        profilePhoto: "",
        title: "",
        value: "",
        image: null,
        share_link: "",
        description: "",
      });
    }
  }, [fetchedDeal, cardData.id, setCardData, fetchDealActivities]);

  /* ------------------------------------------------------------------
   *  PayPal OAuth
   * ------------------------------------------------------------------ */
  const initiatePayPalAuth = () => {
    window.location.href = "/api/paypal/oauth";
  };

  // On mount, see if PayPal sent user info
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalEmail = params.get("paypal_email");
    const userName = params.get("name");

    if (paypalEmail) {
      // Upsert user
      upsertUser({
        paypal_email: paypalEmail,
        name: userName || "New User",
        profile_image_url: "",
      })
        .then((user) => {
          setLocalUser({
            id: user.id,
            paypalEmail: user.paypal_email,
            name: user.name || "",
            profilePhoto: user.profile_image_url || "",
          });
        })
        .catch((err) => {
          console.error("[Home] PayPal OAuth Upsert Error =>", err);
        })
        .finally(() => {
          params.delete("paypal_email");
          params.delete("name");
          navigate({ search: params.toString() }, { replace: true });
        });
    }
  }, [setLocalUser, navigate]);

  /* ------------------------------------------------------------------
   *  Helper => withPayPalAuthCheck
   * ------------------------------------------------------------------ */
  const withPayPalAuthCheck = (actionFn) => {
    if (!localUser.id) {
      initiatePayPalAuth();
    } else {
      actionFn();
    }
  };

  /* ------------------------------------------------------------------
   *  Tapping the card => create/edit or "grab"
   * ------------------------------------------------------------------ */
  const handleCardTap = () => {
    withPayPalAuthCheck(() => {
      if (!cardData.id) {
        // No deal => create new
        setShowCardForm(true);
        return;
      }
      const isCreator = cardData.creatorId === localUser.id;
      if (isCreator) {
        setShowCardForm(true);
      } else {
        // Grab => if value>0 => Payment, else free
        if (parseFloat(cardData.value) > 0) {
          setShowPayment(true);
        } else {
          setShowSaveSheet(true);
        }
      }
    });
  };

  // The "+" => open card form
  const handleOpenCardForm = () => {
    withPayPalAuthCheck(() => {
      setShowCardForm(true);
    });
  };

  // "Grab" => Payment or free
  const handleSave = () => {
    withPayPalAuthCheck(() => {
      if (
        parseFloat(cardData.value) > 0 &&
        cardData.creatorId !== localUser.id
      ) {
        setShowPayment(true);
      } else {
        setShowSaveSheet(true);
      }
    });
  };

  // Called after user closes the SaveSheet
  const finalizeSave = async () => {
    alert("Gift card saved!");
  };

  // After user saves/updates the card in CardForm
  const handleSaveCard = async (formData) => {
    // 1) Upsert user data from the form
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
      console.error("[Home] => handleSaveCard => upsertUser => error =>", err);
      alert("Error updating your user data.");
    }

    // 2) Update cardData in context
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

    // 3) Re-fetch from DB, then close the overlay
    setShowCardForm(false);
    if (formData.id) {
      await fetchDeal({ dealId: formData.id });
    }
  };

  // Tapping user’s profile => show ProfileSheet
  const handleProfileClick = () => {
    withPayPalAuthCheck(() => {
      setShowProfileSheet(true);
    });
  };

  /* ------------------------------------------------------------------
   *  Render
   * ------------------------------------------------------------------ */
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Loading deal...</div>
      </div>
    );
  }

  // If we tried to load a share link but got no deal => "Deal not found"
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
      {/* Main content area */}
      <div className="flex-1 flex flex-col px-4 py-4 items-center w-full max-w-[768px] overflow-hidden">
        <Card onCardTap={handleCardTap} onProfileClick={handleProfileClick} />

        <div className="w-full mt-4 h-full flex flex-col">
          <Buttons onSave={handleSave} />
          <ActivityLog dealId={cardData.id} />
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Floating + Button */}
      <AddButton onOpenCardForm={handleOpenCardForm} />

      {/* Overlays */}
      {showCardForm && (
        <div className="absolute inset-0 z-50 bg-white">
          <CardForm
            onClose={() => setShowCardForm(false)}
            onSave={handleSaveCard}
            cardData={{
              ...cardData,
              // Pre-populate user fields from localUser
              userPayPalEmail: localUser.paypalEmail,
              userName: localUser.name,
              userProfilePhoto: localUser.profilePhoto,
            }}
          />
        </div>
      )}

      {showPayment && (
        <Payment
          onClose={() => {
            setShowPayment(false);
            setShowSaveSheet(true);
          }}
          dealData={{
            ...cardData,
            // Payment might look for creatorPayPalEmail. If it's not set:
            creatorPayPalEmail: cardData?.creatorPayPalEmail || localUser.paypalEmail,
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

export default Home;
