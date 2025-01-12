// src/components/Payment.jsx
import React, { useEffect, useState } from "react";
import { useLocalUser } from "../contexts/LocalUserContext";
import { createOrder, captureOrder } from "../services/paypalService";
import { useActivity } from "../contexts/ActivityContext";

export default function Payment({ onClose, dealData }) {
  const { localUser } = useLocalUser();
  const { addActivity } = useActivity();
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // On mount, create a PayPal order
    if (!localUser.id) {
      alert("Please sign in first.");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const id = await createOrder({
          amount: dealData.value,
          payeeEmail: dealData.creatorPayPalEmail,
        });
        setOrderId(id);
      } catch (err) {
        alert("Error creating PayPal order");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [dealData, localUser.id]);

  const handleCapture = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const result = await captureOrder(orderId);
      console.log("Payment success =>", result);

      // Log an activity
      await addActivity({
        userId: localUser.id,
        dealId: dealData.id,
        action: "grabbed gift card",
      });

      alert("Payment successful! Gift card grabbed.");
      onClose?.();
    } catch (err) {
      console.error("captureOrder error =>", err);
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md w-80 text-center">
        <h2 className="text-xl mb-2">Complete Payment</h2>
        <p>Amount: ${dealData.value}</p>
        <p>Payee: {dealData.creatorPayPalEmail}</p>
        {!orderId && <p>Initializing PayPal order...</p>}
        {orderId && !loading && (
          <button onClick={handleCapture} className="bg-blue-600 text-white w-full p-2 mt-4">
            Capture Payment
          </button>
        )}
        {loading && <p>Processing...</p>}
        <button onClick={onClose} className="bg-gray-400 w-full p-2 mt-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
