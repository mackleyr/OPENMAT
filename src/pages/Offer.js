// src/pages/Offer.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import MainContainer from "../components/MainContainer";
import Footer from "../components/Footer";
import ActivityLog from "../components/ActivityLog";
import Button from "../components/Button";
import { CREATOR, API_BASE } from "../config/Creator";
import { useActivity } from "../contexts/ActivityContext";
import { useLocalUser } from "../contexts/LocalUserContext";
import Onboard from "../components/Onboard";
import OfferForm from "../components/OfferForm";
import Fab from "../components/Fab";

export default function Offer() {
  const { offerId } = useParams();
  const { fetchActivities, activities, getActivitiesByOffer } = useActivity();
  const { localUser } = useLocalUser();
  const [offer, setOffer] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const needsOnboarding = !localUser?.name?.trim() || !localUser?.image_url;
  const busyRef = useRef(false);

  // keep score live from context (never filler)
  const claimsForThisOffer = useMemo(
    () => getActivitiesByOffer(offerId).filter(a => (a.type === "claim" || a.action === "claimed")),
    [offerId, getActivitiesByOffer, activities]
  );

  useEffect(() => {
    (async () => {
      const r = await fetch(`${API_BASE}/api/offers/get?id=${encodeURIComponent(offerId)}`);
      const j = await r.json();
      if (j?.ok) setOffer(j.offer);
    })();
    fetchActivities({ offerId });
  }, [offerId, fetchActivities]);

  // Handle Stripe redirect confirmation on this page too (ensures refresh)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (!sid) return;
    (async () => {
      try {
        await fetch(`${API_BASE}/api/checkout/confirm?session_id=${encodeURIComponent(sid)}`);
      } catch (e) {
        console.error("[Offer] /confirm error:", e);
      } finally {
        fetchActivities({ offerId });
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [offerId, fetchActivities]);

  const ensureOnboarded = async () => {
    if (needsOnboarding) {
      setShowOnboard(true);
      return false;
    }
    return true;
  };

  const claim = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const ok = await ensureOnboarded();
      if (!ok) { busyRef.current = false; return; }

      if (!offer || offer.price_cents <= 0) {
        // FREE CLAIM: write immediately
        const r = await fetch(`${API_BASE}/api/claims/free`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            dealId: CREATOR.dealId,
            donorId: localUser?.id || null,
            donorName: localUser?.name || "Anonymous",
            donorImageUrl: localUser?.image_url || null,
          }),
        });
        const j = await r.json();
        if (!j?.ok) throw new Error(j?.error || "claim_failed");
        // local refresh ensures visible immediately even if realtime lags
        fetchActivities({ offerId });
        return;
      }

      // PAID CLAIM: Stripe Checkout
      const r = await fetch(`${API_BASE}/api/claims/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          dealId: CREATOR.dealId,
          donorId: localUser?.id || null,
          donorName: localUser?.name || "Anonymous",
          donorImageUrl: localUser?.image_url || null,
        }),
      });
      const j = await r.json();
      if (!j?.url) throw new Error("Could not start Checkout");
      window.location.href = j.url;
    } catch (e) {
      alert(e?.message || "Claim failed");
    } finally {
      busyRef.current = false;
    }
  };

  const startCreateOffer = () => {
    if (needsOnboarding) setShowOnboard(true);
    else setShowCreate(true);
  };

  if (!offer) return null;

  return (
    <MainContainer>
      {/* Scrollable phone content */}
      <div
        className="flex flex-col flex-1 min-h-0 w-full p-6 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {/* Creator row mirrors Home */}
        <div className="flex items-center gap-3 mb-2">
          <img src={CREATOR.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          <div className="text-sm font-semibold">{CREATOR.name}</div>
        </div>

        <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[4/3] mb-3">
          {offer.image_url ? (
            <img src={offer.image_url} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>

        <div className="mb-3">
          <div className="text-lg font-semibold">{offer.title}</div>
          <div className="text-sm text-gray-500">
            {offer.price_cents > 0 ? `$${(offer.price_cents/100).toFixed(2)}` : "Free"} · Score = {claimsForThisOffer.length}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button type="primary" onClick={claim}>Claim</Button>
          <Button type="secondary" onClick={async () => {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link copied");
          }}>Share</Button>
        </div>

        {/* Offer-scoped activity (duplicated header via ActivityLog) */}
        <div className="flex-1 min-h-0">
          <ActivityLog offerId={offerId} />
        </div>
      </div>

      <Footer />

      {/* Floating creator “+” */}
      <Fab onClick={startCreateOffer} />

      {/* Gate then create */}
      <Onboard
        open={showOnboard}
        current={localUser}
        onClose={() => setShowOnboard(false)}
        onDone={() => { setShowOnboard(false); setShowCreate(true); }}
      />
      <OfferForm open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />
    </MainContainer>
  );
}
