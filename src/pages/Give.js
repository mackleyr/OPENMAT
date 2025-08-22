// src/pages/Give.js
import React, { useMemo, useState } from "react";
import MainContainer from "../components/MainContainer";
import Footer from "../components/Footer";
import AmountChips from "../components/AmountChips";
import PaymentRequestButton from "../components/PaymentRequestButton";
import { useLocalUser } from "../contexts/LocalUserContext";
import { supabase } from "../supabaseClient";
import Onboard from "../components/Onboard";
import { useNavigate, useSearchParams } from "react-router-dom";

const DEAL_ID = "default";

export default function Give() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const preset = sp.get("amount");

  const { localUser, setLocalUser } = useLocalUser();
  const [amount, setAmount] = useState(preset ? Number(preset) : 50);
  const [showOnboard, setShowOnboard] = useState(false);

  const amountCents = useMemo(
    () => Math.round(Number(amount || 0) * 100),
    [amount]
  );

  const needsOnboarding = !localUser?.name || !localUser?.image_url;

  const ensureOnboarded = async () => {
    if (needsOnboarding) {
      setShowOnboard(true);
      return false;
    }
    return true;
  };

  const handleOnboardDone = (p) => {
    setLocalUser((prev) => ({ ...prev, ...p }));
    setShowOnboard(false);
    navigate(`/give?amount=${amount}`);
  };

  const onPaid = async ({ payment_intent_id = null } = {}) => {
    // Optimistic insert so Activity feed pops instantly
    try {
      await supabase.from("activities").insert({
        deal_id: DEAL_ID,
        type: "give",
        amount_cents: amountCents,
        donor_name: localUser?.name ?? "Anonymous",
        donor_image: localUser?.image_url ?? null,
        stripe_payment_intent_id: payment_intent_id,
      });
    } catch (e) {
      console.error("[Give] feed insert failed:", e);
    }
    navigate("/");
  };

  return (
    <MainContainer>
      <div className="flex flex-col items-center justify-start flex-1 w-full p-6">
        <h2 className="mt-2 text-xl font-bold text-center">
          Donate to {localUser?.name || "Anonymous"}
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
            amountCents={amountCents}
            dealId={DEAL_ID}
            donorName={localUser?.name || "Anonymous"}
            donorImageUrl={localUser?.image_url || null}
            ensureOnboarded={ensureOnboarded}
            onSuccess={onPaid}
          />
        </div>
      </div>

      <Footer />

      <Onboard
        open={showOnboard}
        current={localUser}
        onClose={() => setShowOnboard(false)}
        onDone={handleOnboardDone}
      />
    </MainContainer>
  );
}
