// src/pages/Home.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import MainContainer from "../components/MainContainer";
import Profile from "../components/Profile";
import Button from "../components/Button";
import ActivityLog from "../components/ActivityLog";
import Footer from "../components/Footer";

import { useActivity } from "../contexts/ActivityContext";
import { CREATOR, API_BASE } from "../config/Creator";

export default function Home() {
  const navigate = useNavigate();
  const { fetchDealActivities, activities } = useActivity();
  const dealId = CREATOR.dealId;

  useEffect(() => {
    console.log("[Home] mount – fetch activity for", dealId);
    fetchDealActivities(dealId);
  }, [fetchDealActivities, dealId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (!sid) return;

    (async () => {
      try {
        console.log("[Home] confirming session:", sid);
        const r = await fetch(
          `${API_BASE}/api/checkout/confirm?session_id=${encodeURIComponent(sid)}`
        );
        const j = await r.json();
        console.log("[Home] /confirm →", j);
      } catch (e) {
        console.error("[Home] /confirm error:", e);
      } finally {
        fetchDealActivities(dealId);
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [fetchDealActivities, dealId]);

  useEffect(() => {
    console.log("[Home] activities now:", activities?.length ?? 0);
  }, [activities]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <MainContainer>
      <div
        id="main-container"
        className="w-full max-w-md mx-auto flex flex-col items-center justify-start flex-1 p-6"
      >
        <Profile src={CREATOR.imageUrl} size={100} />
        <h2 className="mt-2 text-xl font-bold text-center">{CREATOR.name}</h2>

        <div className="mt-6 grid w-full grid-cols-2 gap-4">
          <Button type="secondary" onClick={handleShare}>Share</Button>
          <Button type="secondary" onClick={() => navigate("/give")}>Give</Button>
        </div>

        <div className="mt-6 w-full flex-1">
          <ActivityLog dealId={dealId} />
        </div>
      </div>

      <Footer />
    </MainContainer>
  );
}
