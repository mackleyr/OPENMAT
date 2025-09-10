// src/pages/Home.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainContainer from "../components/MainContainer";
import Profile from "../components/Profile";
import Button from "../components/Button";
import ActivityLog from "../components/ActivityLog";
import Footer from "../components/Footer";

import { useActivity } from "../contexts/ActivityContext";
import { useLocalUser } from "../contexts/LocalUserContext";
import Onboard from "../components/Onboard";

import { CREATOR, API_BASE } from "../config/Creator";
import OfferCard from "../components/OfferCard";
import OfferForm from "../components/OfferForm";
import Fab from "../components/Fab";

export default function Home() {
  const navigate = useNavigate();
  const { fetchActivities, activities } = useActivity();
  const { localUser } = useLocalUser();
  const dealId = CREATOR.dealId;

  const [offers, setOffers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const needsOnboarding = !localUser?.name?.trim() || !localUser?.image_url;

  useEffect(() => {
    fetchActivities({ dealId });
  }, [fetchActivities, dealId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (!sid) return;

    (async () => {
      try {
        await fetch(`${API_BASE}/api/checkout/confirm?session_id=${encodeURIComponent(sid)}`);
      } catch (e) {
        console.error("[Home] /confirm error:", e);
      } finally {
        fetchActivities({ dealId });
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [fetchActivities, dealId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/offers/list?deal_id=${encodeURIComponent(dealId)}`);
        const j = await r.json();
        setOffers(j?.offers || []);
      } catch {}
    })();
  }, [dealId]);

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); alert("Link copied"); }
    catch { alert("Copy failed"); }
  };

  const score = (activities || []).filter(a => a.offer_id).length;

  const startCreateOffer = () => {
    if (needsOnboarding) setShowOnboard(true);
    else setShowCreate(true);
  };

  return (
    <MainContainer>
      {/* Make the whole phone vertically scrollable */}
      <div
        id="main-container"
        className="flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto p-6 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <div className="flex flex-col items-center flex-shrink-0">
          <Profile src={CREATOR.imageUrl} size={100} />
          <h2 className="mt-2 text-xl font-bold text-center">{CREATOR.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Score: {score}</p>

          <div className="mt-6 grid w-full grid-cols-2 gap-4">
            <Button type="secondary" onClick={handleShare}>Share</Button>
            <Button type="secondary" onClick={() => navigate("/give")}>Subscribe</Button>
          </div>
        </div>

        {/* Offers */}
        <div className="mt-6 w-full">
          <div className="px-1 py-2 border-b border-gray-300">
            <span className="text-base font-semibold">Offers</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} onClick={() => navigate(`/o/${o.id}`)} />
            ))}
            <button
              className="h-36 rounded-xl border border-dashed border-gray-300 text-gray-500"
              onClick={startCreateOffer}
              aria-label="Create offer"
            >
              ＋
            </button>
          </div>
        </div>

        {/* Global activity preview (same header style via ActivityLog) */}
        <div className="mt-6 w-full">
          <ActivityLog dealId={dealId} />
        </div>
      </div>

      <Footer />

      {/* Floating creator “+” */}
      <Fab onClick={startCreateOffer} />

      {/* Onboarding gate */}
      <Onboard
        open={showOnboard}
        current={localUser}
        onClose={() => setShowOnboard(false)}
        onDone={() => { setShowOnboard(false); setShowCreate(true); }}
      />

      {/* Offer form → navigate straight to new offer */}
      <OfferForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(o) => {
          setOffers((prev) => [o, ...prev]);
          setShowCreate(false);
          if (o?.id) navigate(`/o/${o.id}`);
        }}
      />
    </MainContainer>
  );
}
