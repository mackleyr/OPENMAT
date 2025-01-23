// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

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
  const location = useLocation();

  // Global contexts
  const { cardData, setCardData } = useCard();
  const { localUser, setLocalUser } = useLocalUser();
  const { fetchDealActivities } = useActivity();

  // /share/:creatorName/:dealId
  const { creatorName, dealId } = useParams();

  // Overlays
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  // Track if user has paid
  const [userHasPaid, setUserHasPaid] = useState(false);

  // Build share URL if we have creatorName + dealId
  const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
  const shareURL = creatorName && dealId ? `${baseUrl}/share/${creatorName}/${dealId}` : null;

  // useFetchDeal to load the deal
  const {
    deal: fetchedDeal,
    loading,
    error,
    fetchDeal,
  } = useFetchDeal({ initialShareLink: shareURL });

  // Once we have fetchedDeal, store it + fetch activities
  useEffect(() => {
    if (fetchedDeal && fetchedDeal.id !== cardData.id) {
      setCardData({
        id: fetchedDeal.id,
        creatorId: fetchedDeal.creatorId,
        creatorPayPalEmail: fetchedDeal.creatorPayPalEmail,
        name: fetchedDeal.creatorName,
        profilePhoto: fetchedDeal.creatorPhoto,
        title: fetchedDeal.title,
        value: fetchedDeal.value,
        image: fetchedDeal.image,
        share_link: fetchedDeal.share_link,
      });
      fetchDealActivities(fetchedDeal.id);
    } else if (!fetchedDeal) {
      // Reset if no deal found
      setCardData({
        id: null,
        creatorId: null,
        creatorPayPalEmail: "",
        name: "",
        profilePhoto: "",
        title: "",
        value: "",
        image: null,
        share_link: "",
      });
    }
  }, [fetchedDeal, cardData.id, setCardData, fetchDealActivities]);

  // PayPal OAuth for the creator’s sign-in
  const initiatePayPalAuth = (action = "login") => {
    const currentPath = location.pathname + location.search;
    const redirectUri = encodeURIComponent(currentPath);
    window.location.href = `/api/paypal/oauth?redirect_uri=${redirectUri}&action=${action}`;
  };

  const withPayPalAuthCheck = (actionFn, action = "login") => {
    if (!localUser.id) {
      initiatePayPalAuth(action);
    } else {
      actionFn();
    }
  };

  // On mount => parse ?paypal_email=..., ?name=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalEmail = params.get("paypal_email");
    const userName = params.get("name");

    if (paypalEmail) {
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
          console.error("[Home] => PayPal OAuth Upsert Error =>", err);
        })
        .finally(() => {
          params.delete("paypal_email");
          params.delete("name");
          params.delete("action");
          navigate({ search: params.toString() }, { replace: true });
        });
    }
  }, [setLocalUser, navigate]);

  // Tapping the card => create/edit or pay
  const handleCardTap = () => {
    if (!cardData.id) {
      withPayPalAuthCheck(() => setShowCardForm(true), "create");
    } else {
      const isCreator = cardData.creatorId === localUser.id;
      if (isCreator) {
        withPayPalAuthCheck(() => setShowCardForm(true), "create");
      } else {
        if (!userHasPaid) {
          setShowPayment(true);
        } else {
          setShowSaveSheet(true);
        }
      }
    }
  };

  // "+" => create new (always require sign-in)
  const handleOpenCardForm = () => {
    withPayPalAuthCheck(() => {
      setShowCardForm(true);
    }, "create");
  };

  // "Grab" => pay if not the creator
  const handleSave = () => {
    if (cardData.creatorId === localUser.id) {
      alert("You already own this card.");
      return;
    }
    if (!userHasPaid) {
      setShowPayment(true);
    } else {
      setShowSaveSheet(true);
    }
  };

  // After user closes the SaveSheet
  const finalizeSave = async () => {
    alert("Gift card saved!");
  };

  // After user saves/updates the deal in CardForm
  const handleSaveCard = async (formData) => {
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
      alert("Error updating user data.");
    }

    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      creatorId: localUser.id,
      creatorPayPalEmail: prev.creatorPayPalEmail || "",
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      name: formData.userName,
      profilePhoto: formData.userProfilePhoto,
      share_link: formData.share_link || prev.share_link,
    }));

    setShowCardForm(false);
    if (formData.id) {
      await fetchDeal({ dealId: formData.id });
    }
  };

  // Tapping user’s profile => ProfileSheet
  const handleProfileClick = () => {
    withPayPalAuthCheck(() => setShowProfileSheet(true), "login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Loading deal...</div>
      </div>
    );
  }

  const triedShareLink = creatorName && dealId;
  if (triedShareLink && (!fetchedDeal || error)) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="text-center mt-8">Deal not found.</div>
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

      <AddButton onOpenCardForm={handleOpenCardForm} />

      {showCardForm && (
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

      {showPayment && (
        <Payment
          onClose={() => setShowPayment(false)}
          onPaymentSuccess={() => {
            setUserHasPaid(true);
            setShowPayment(false);
            setShowSaveSheet(true);
          }}
          dealData={{
            ...cardData,
            creatorPayPalEmail: cardData?.creatorPayPalEmail,
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
            dealData={cardData}
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
