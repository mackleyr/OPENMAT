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
  const { addActivity, fetchDealActivities } = useActivity();

  // /share/:creatorName/:dealId from the route
  const { creatorName, dealId } = useParams();

  // Overlays
  const [showCardForm, setShowCardForm] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  // Track if this user has already paid for the gift card
  const [userHasPaid, setUserHasPaid] = useState(false);

  // We'll store the "action" returned from OAuth
  const [oauthAction, setOauthAction] = useState(null);

  // Build share URL if we have creatorName + dealId
  const baseUrl = process.env.REACT_APP_DOMAIN || window.location.origin;
  const shareURL = creatorName && dealId ? `${baseUrl}/share/${creatorName}/${dealId}` : null;

  // 1) useFetchDeal to load the deal
  const {
    deal: fetchedDeal,
    loading,
    error,
    fetchDeal,
  } = useFetchDeal({ initialShareLink: shareURL });

  // 2) Once we have fetchedDeal, store it + fetch activities
  useEffect(() => {
    if (fetchedDeal && fetchedDeal.id !== cardData.id) {
      setCardData({
        id: fetchedDeal.id,
        creatorId: fetchedDeal.creatorId,
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
        name: "",
        profilePhoto: "",
        title: "",
        value: "",
        image: null,
        share_link: "",
      });
    }
  }, [fetchedDeal, cardData.id, setCardData, fetchDealActivities]);

  /* ------------------------------------------------------------------
   * PayPal OAuth
   * ------------------------------------------------------------------ */

  // Enhanced init function: pass along current path & desired action
  const initiatePayPalAuth = (action = "login") => {
    // Current route, e.g. "/share/john/123?foo=bar"
    const currentPath = location.pathname + location.search;

    // We'll pass it as redirect_uri (URL-encoded) plus an 'action' param
    const redirectUri = encodeURIComponent(currentPath);
    window.location.href = `/api/paypal/oauth?redirect_uri=${redirectUri}&action=${action}`;
  };

  // If localUser is missing => redirect to PayPal OAuth
  // Otherwise run the callback
  const withPayPalAuthCheck = (actionFn, action = "login") => {
    if (!localUser.id) {
      initiatePayPalAuth(action);
    } else {
      actionFn();
    }
  };

  // On mount => parse ?paypal_email=..., ?name=..., & ?action=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalEmail = params.get("paypal_email");
    const userName = params.get("name");
    const returnedAction = params.get("action");

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
          setOauthAction(returnedAction || null);
        })
        .catch((err) => {
          console.error("[Home] => PayPal OAuth Upsert Error =>", err);
        })
        .finally(() => {
          // Clean up query params so we don't re-run this
          params.delete("paypal_email");
          params.delete("name");
          params.delete("action");
          navigate({ search: params.toString() }, { replace: true });
        });
    } else if (returnedAction) {
      // If there's an action param but no paypal_email, user might already be logged in
      setOauthAction(returnedAction);
      params.delete("action");
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [setLocalUser, navigate]);

  // Once we have a localUser and an oauthAction, decide what to do:
  useEffect(() => {
    if (localUser.id && oauthAction) {
      // If user came back with "pay" but there's no deal => open form
      // If there's a deal but user is the creator, open form
      // Otherwise, open Payment
      if (oauthAction === "pay") {
        if (cardData.id && cardData.creatorId !== localUser.id) {
          // proceed to pay
          setShowPayment(true);
        } else {
          // open card form
          setShowCardForm(true);
        }
      } else if (oauthAction === "create") {
        // force open the Card Form
        setShowCardForm(true);
      }
      // Clear it so we don't re-run
      setOauthAction(null);
    }
  }, [localUser, oauthAction, cardData]);

  /* ------------------------------------------------------------------
   * Tapping the card => create/edit or attempt to "grab"
   * ------------------------------------------------------------------ */
  const handleCardTap = () => {
    // If no deal => user is creating
    if (!cardData.id) {
      withPayPalAuthCheck(() => {
        setShowCardForm(true);
      }, "create");
    } else {
      // If we have a deal => either editing (creator) or paying (non-creator)
      const isCreator = cardData.creatorId === localUser.id;
      if (isCreator) {
        withPayPalAuthCheck(() => {
          setShowCardForm(true);
        }, "create");
      } else {
        // Non-creator => pay first if not paid
        withPayPalAuthCheck(() => {
          if (!userHasPaid) {
            setShowPayment(true);
          } else {
            // user has paid => show SaveSheet
            setShowSaveSheet(true);
          }
        }, "pay");
      }
    }
  };

  // The "+" => create new
  const handleOpenCardForm = () => {
    withPayPalAuthCheck(() => {
      setShowCardForm(true);
    }, "create");
  };

  // The "Grab" button => same logic as tapping the card (pay or show SaveSheet)
  const handleSave = () => {
    withPayPalAuthCheck(() => {
      if (!userHasPaid && cardData.creatorId !== localUser.id) {
        setShowPayment(true);
      } else {
        setShowSaveSheet(true);
      }
    }, "pay");
  };

  // Called after user closes the SaveSheet
  const finalizeSave = async () => {
    alert("Gift card saved!");
  };

  // After user saves/updates the deal in CardForm
  const handleSaveCard = async (formData) => {
    try {
      // Upsert user if new name/photo
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

    // Update cardData
    setCardData((prev) => ({
      ...prev,
      id: formData.id,
      creatorId: localUser.id,
      image: formData.dealImage,
      value: formData.dealValue,
      title: formData.dealTitle,
      name: formData.userName,
      profilePhoto: formData.userProfilePhoto,
      share_link: formData.share_link || prev.share_link,
    }));

    // Re-fetch => close overlay
    setShowCardForm(false);
    if (formData.id) {
      await fetchDeal({ dealId: formData.id });
    }
  };

  // Tapping user’s profile => ProfileSheet
  const handleProfileClick = () => {
    withPayPalAuthCheck(() => {
      setShowProfileSheet(true);
    }, "login");
  };

  /* ------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="text-center mt-8 text-white">Loading deal...</div>
      </div>
    );
  }

  // If share link but no deal => "Deal not found"
  const triedToLoadShareLink = creatorName && dealId;
  if (triedToLoadShareLink && (!fetchedDeal || error)) {
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

      {/* + Button => create deal */}
      <AddButton onOpenCardForm={handleOpenCardForm} />

      {/* Overlays */}
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
          // We just close Payment if user cancels:
          onClose={() => setShowPayment(false)}

          // If Payment is successful => set userHasPaid & open SaveSheet
          onPaymentSuccess={() => {
            setUserHasPaid(true);
            setShowPayment(false);
            setShowSaveSheet(true);
          }}
          dealData={{
            ...cardData,
            creatorPayPalEmail:
              cardData?.creatorPayPalEmail || localUser.paypalEmail,
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
