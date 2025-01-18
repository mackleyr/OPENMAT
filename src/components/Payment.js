// src/components/Payment.jsx
import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useLocalUser } from "../contexts/LocalUserContext";
import { useActivity } from "../contexts/ActivityContext";

export default function Payment({ onClose, onPaymentSuccess, dealData }) {
  const { localUser } = useLocalUser();
  const { addActivity } = useActivity();
  const [isCapturing, setIsCapturing] = useState(false);

  if (!dealData?.value || !dealData?.creatorPayPalEmail) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md">
          <p>Invalid deal info. Missing value or payee email.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const amount = dealData.value.toString();
  const payeeEmail = dealData.creatorPayPalEmail;

  const handleApprove = async (orderID) => {
    try {
      setIsCapturing(true);
      // 1) POST to /api/paypal/capture-order
      const captureRes = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderID }),
      });
      const captureData = await captureRes.json();
      if (!captureRes.ok) throw new Error(captureData.error || "Capture failed");

      console.log("[Payment] => PayPal capture success =>", captureData);

      // 2) Log “grabbed gift card” in Activity
      await addActivity({
        userId: localUser.id,
        dealId: dealData.id,
        action: "grabbed gift card",
      });

      // 3) Fire parent's success callback
      if (onPaymentSuccess) {
        onPaymentSuccess();
      } else {
        // fallback
        alert("Payment successful! You grabbed the gift card.");
        onClose?.();
      }
    } catch (err) {
      console.error("[Payment] => handleApprove => error =>", err);
      alert("Error capturing payment.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Toggle sandbox vs. live for the PayPal buttons
  const isSandbox = process.env.REACT_APP_PAYPAL_ENV === "sandbox";
  const clientId = isSandbox
    ? process.env.REACT_APP_PAYPAL_SANDBOX_CLIENT_ID
    : process.env.REACT_APP_PAYPAL_LIVE_CLIENT_ID;

  return (
    <PayPalScriptProvider
      options={{
        "client-id": clientId || "TEST",
        currency: "USD",
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md w-80 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-xl font-bold"
          >
            ✕
          </button>
          <h2 className="text-xl mb-2">Grab Gift Card</h2>
          <p className="text-md mb-4">
            Pay <strong>${amount}</strong> to {payeeEmail}
          </p>

          <PayPalButtons
            fundingSource={undefined}
            createOrder={async () => {
              // 1) Call your server to create an order
              const createRes = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount,
                  payeeEmail,
                }),
              });
              const createData = await createRes.json();
              if (!createRes.ok) {
                throw new Error(createData.error || "Create order failed");
              }
              return createData.id; // The new PayPal order ID
            }}
            onApprove={async (data) => {
              // PayPal passes data.orderID
              await handleApprove(data.orderID);
            }}
            onCancel={() => {
              console.log("[Payment] => User canceled PayPal payment");
              onClose?.();
            }}
            onError={(err) => {
              console.error("[Payment] => PayPalButtons onError =>", err);
              alert("PayPal checkout error.");
            }}
            style={{ layout: "vertical", color: "blue", shape: "rect", label: "paypal" }}
          />

          {isCapturing && <p>Capturing payment...</p>}
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
