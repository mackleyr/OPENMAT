// src/pages/Give.js
import React, { useMemo, useRef, useState } from "react";
import MainContainer from "../components/MainContainer";
import Footer, { FOOTER_PX } from "../components/Footer"; // header bar (logo-only)
import AmountChips from "../components/AmountChips";
import PaymentRequestButton from "../components/PaymentRequestButton";
import { useLocalUser } from "../contexts/LocalUserContext";
import Onboard from "../components/Onboard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CREATOR } from "../config/Creator";

const DEAL_ID = "default";

export default function Give() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const preset = sp.get("amount");

  const { localUser, setLocalUser } = useLocalUser();
  const [amount, setAmount] = useState(preset ? Number(preset) : 50);
  const [showOnboard, setShowOnboard] = useState(false);
  const payRef = useRef(null);

  const amountCents = useMemo(
    () => Math.round(Number(amount || 0) * 100),
    [amount]
  );

  // name + image are required before starting payment
  const needsOnboarding = !localUser?.name?.trim() || !localUser?.image_url;

  const ensureOnboarded = async () => {
    if (needsOnboarding) {
      setShowOnboard(true);
      return false;
    }
    return true;
  };

  const handleOnboardDone = (p) => {
    const next = {
      ...localUser,
      name: p?.name?.trim() || "Anonymous",
      image_url: p?.image_url || null,
    };
    setLocalUser(next);
    setShowOnboard(false);

    // auto-start checkout to reduce taps
    setTimeout(() => {
      try {
        payRef.current?.start?.();
      } catch {}
    }, 0);
  };

  const onPaid = () => navigate("/?success=1");

  return (
    <MainContainer>
      {/* header inside the phone */}
      <Footer />

      {/* content; pad from the header height so it never overlaps */}
      <div
        className="flex flex-col items-center justify-start flex-1 w-full p-6 overflow-y-auto"
        style={{
          paddingTop: FOOTER_PX + 8, // keep content clear of the logo bar
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        <h2 className="mt-2 text-xl font-bold text-center">
          Give to {CREATOR?.name || "OPENMAT"}
        </h2>

        <div className="w-full mt-6 max-w-md space-y-4">
          <AmountChips value={Number(amount)} onChange={setAmount} />

          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-full px-6 py-3 text-center"
            inputMode="numeric"
            pattern="[0-9]*"
          />

          <PaymentRequestButton
            ref={payRef}
            amountCents={amountCents}
            dealId={DEAL_ID}
            donorName={localUser?.name || "Anonymous"}
            ensureOnboarded={ensureOnboarded}
            onSuccess={onPaid}
          />

          <p className="text-center text-[13px] text-gray-500 mt-2">
            If no wallet button shows, your device/browser doesn’t support
            Apple/Google Pay.
          </p>
        </div>
      </div>

      {/* onboarding modal */}
      <Onboard
        open={showOnboard}
        current={localUser}
        onClose={() => setShowOnboard(false)}
        onDone={handleOnboardDone}
      />
    </MainContainer>
  );
}
