import React, { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const PUBLISHABLE_KEY =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

const API =
  process.env.REACT_APP_API_BASE || "http://localhost:3001";

export default function PaymentRequestButton({
  amountCents,
  dealId = "default",
  donorName,
  donorImageUrl,
  ensureOnboarded,
  onSuccess,
}) {
  const mountRef = useRef(null);
  const [walletReady, setWalletReady] = useState(false);

  useEffect(() => {
    let stripe, elements, pr, prButton;

    (async () => {
      try {
        if (!PUBLISHABLE_KEY) {
          console.warn("[wallet] Missing STRIPE_PUBLISHABLE_KEY");
          setWalletReady(false);
          return;
        }
        stripe = await loadStripe(PUBLISHABLE_KEY);
        if (!stripe) {
          setWalletReady(false);
          return;
        }

        pr = stripe.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: "Donation", amount: amountCents },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const can = await pr.canMakePayment();
        if (!can) {
          setWalletReady(false);
          return;
        }

        setWalletReady(true);
        elements = stripe.elements();
        prButton = elements.create("paymentRequestButton", {
          paymentRequest: pr,
          style: { paymentRequestButton: { type: "donate", theme: "dark", height: "44px" } },
        });
        prButton.mount(mountRef.current);

        pr.on("paymentmethod", async (ev) => {
          try {
            if (ensureOnboarded) {
              const ok = await ensureOnboarded();
              if (!ok) return ev.complete("fail");
            }

            const resp = await fetch(`${API}/api/payments/create-intent`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amountCents,
                currency: "usd",
                dealId,
                donorName,
              }),
            });
            if (!resp.ok) throw new Error(`create-intent ${resp.status}`);
            const { clientSecret, error } = await resp.json();
            if (error || !clientSecret) throw new Error(error || "Failed to create intent");

            const confirm = await stripe.confirmCardPayment(
              clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: true }
            );

            if (confirm.error) {
              ev.complete("fail");
              alert(confirm.error.message);
              return;
            }

            ev.complete("success");

            const result = await stripe.confirmCardPayment(clientSecret);
            if (result.error) {
              alert(result.error.message);
              return;
            }

            onSuccess?.({
              payment_intent_id: result.paymentIntent?.id || confirm.paymentIntent?.id,
            });
          } catch (e) {
            console.error("[wallet confirm] error:", e);
            ev.complete("fail");
            alert(e?.message || "Payment failed");
          }
        });
      } catch (e) {
        console.error("[wallet init] error:", e);
        setWalletReady(false);
      }
    })();

    return () => {
      try { pr && pr.off("paymentmethod"); } catch {}
      try { prButton && prButton.unmount(); } catch {}
    };
  }, [amountCents, dealId, donorName, ensureOnboarded, onSuccess]);

  const fallbackGive = async () => {
    try {
      if (ensureOnboarded) {
        const ok = await ensureOnboarded();
        if (!ok) return;
      }
      const resp = await fetch(`${API}/api/donate/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          donorName: donorName || "Anonymous",
          dealId,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const json = await resp.json();
      if (!json?.url) throw new Error("Could not start Checkout");
      window.location.href = json.url;
    } catch (e) {
      console.error("[fallback give] error:", e);
      alert(e?.message || "Could not start Checkout");
    }
  };

  return (
    <div className="w-full">
      {walletReady ? (
        <div ref={mountRef} className="w-full flex justify-center" />
      ) : (
        <button
          type="button"
          onClick={fallbackGive}
          className="w-full py-3 rounded-full bg-black text-white font-medium"
        >
          Give
        </button>
      )}
      <p className="text-xs text-center text-gray-500 mt-3">
        If no wallet button shows, your device/browser doesn’t support Apple/Google Pay.
      </p>
    </div>
  );
}
