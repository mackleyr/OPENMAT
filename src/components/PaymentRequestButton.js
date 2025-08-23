// src/components/PaymentRequestButton.js
import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { loadStripe } from "@stripe/stripe-js";
import { API_BASE } from "../config/Creator";

const PUBLISHABLE_KEY =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) ||
  "";

/**
 * Exposes .start() via ref to trigger the fallback (Checkout) flow.
 */
const PaymentRequestButton = forwardRef(function PaymentRequestButton(
  {
    amountCents,
    dealId = "default",
    donorId = null,
    donorName = "Anonymous",
    donorImageUrl = null,
    ensureOnboarded,
    onSuccess,
  },
  ref
) {
  const mountRef = useRef(null);
  const prRef = useRef(null);
  const prButtonRef = useRef(null);
  const stripeRef = useRef(null);
  const submittingRef = useRef(false);

  const [walletReady, setWalletReady] = useState(false);

  // Expose imperative start() to parent (used by Give.js after onboarding)
  useImperativeHandle(ref, () => ({
    start: () => fallbackGive(),
  }));

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        if (!PUBLISHABLE_KEY) {
          console.warn("[wallet] Missing STRIPE_PUBLISHABLE_KEY");
          setWalletReady(false);
          return;
        }

        const stripe = await loadStripe(PUBLISHABLE_KEY);
        if (!stripe) {
          setWalletReady(false);
          return;
        }
        stripeRef.current = stripe;

        const pr = stripe.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: "Donation", amount: amountCents },
          requestPayerName: true,
          requestPayerEmail: true,
        });
        prRef.current = pr;

        const can = await pr.canMakePayment();
        if (!can) {
          setWalletReady(false);
          return;
        }

        const elements = stripe.elements();
        const prButton = elements.create("paymentRequestButton", {
          paymentRequest: pr,
          style: {
            paymentRequestButton: {
              type: "donate",
              theme: "dark",
              height: "44px",
            },
          },
        });
        prButtonRef.current = prButton;

        // Ensure the DOM node exists before mounting
        await new Promise(requestAnimationFrame);
        if (isCancelled) return;
        if (!mountRef.current) {
          setWalletReady(false);
          return;
        }

        prButton.mount(mountRef.current);
        setWalletReady(true);

        pr.on("paymentmethod", async (ev) => {
          if (submittingRef.current) return;
          submittingRef.current = true;

          try {
            if (ensureOnboarded) {
              const ok = await ensureOnboarded();
              if (!ok) {
                submittingRef.current = false;
                ev.complete("fail");
                return;
              }
            }

            const resp = await fetch(`${API_BASE}/api/payments/create-intent`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amountCents,
                currency: "usd",
                dealId,
                donorId,
                donorName,
                donorImageUrl,
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
              submittingRef.current = false;
              return;
            }
            ev.complete("success");

            const result = await stripe.confirmCardPayment(clientSecret);
            if (result.error) {
              alert(result.error.message);
              submittingRef.current = false;
              return;
            }

            onSuccess?.({
              payment_intent_id:
                result.paymentIntent?.id || confirm.paymentIntent?.id,
            });
          } catch (e) {
            console.error("[wallet confirm] error:", e);
            ev.complete("fail");
            alert(e?.message || "Payment failed");
          } finally {
            submittingRef.current = false;
          }
        });
      } catch (e) {
        console.error("[wallet init] error:", e);
        setWalletReady(false);
      }
    })();

    return () => {
      isCancelled = true;
      try {
        prRef.current && prRef.current.off && prRef.current.off("paymentmethod");
      } catch {}
      try {
        prButtonRef.current && prButtonRef.current.unmount();
      } catch {}
    };
  }, [
    amountCents,
    dealId,
    donorId,
    donorName,
    donorImageUrl,
    ensureOnboarded,
    onSuccess,
  ]);

  const fallbackGive = async () => {
    try {
      if (ensureOnboarded) {
        const ok = await ensureOnboarded();
        if (!ok) return;
      }
      const resp = await fetch(`${API_BASE}/api/donate/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          donorId,
          donorName: donorName || "Anonymous",
          donorImageUrl: donorImageUrl || null,
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
      {/* Wallet button mount target needs a minimum height to be visible */}
      <div
        ref={mountRef}
        className="w-full flex justify-center"
        style={{ minHeight: 48 }}
      />

      {/* Fallback Give button if wallets are not available */}
      {!walletReady && (
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
});

export default PaymentRequestButton;
