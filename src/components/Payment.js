import React, { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import Text from "../config/Text";
import Button from "./Button";
import { mainColor, textColors } from "../config/Colors";
import { useLocalUser } from "../contexts/LocalUserContext";
import { supabase } from "../supabaseClient";

export default function Payment({ onClose, dealData }) {
  const { localUser, setLocalUser } = useLocalUser();
  const isCreator = localUser?.id === dealData.creator_id;
  const [paypalEmail, setPaypalEmail] = useState(localUser?.paypalEmail || "");

  // 1. CREATOR => “Connect PayPal”
  const handleConnectPayPal = async () => {
    const { data, error } = await supabase
      .from("users")
      .update({ paypal_email: paypalEmail })
      .eq("id", localUser.id)
      .select("*")
      .single();

    if (error) {
      alert("Error saving PayPal email");
      return;
    }
    // Sync with local context
    setLocalUser((prev) => ({
      ...prev,
      paypalEmail: data.paypal_email,
      name: data.name,
      profilePhoto: data.profile_image_url,
    }));

    alert("PayPal email saved!");
    onClose?.();
  };

  // 2. VISITOR => create PayPal order via server
  const handleCreateOrder = () => {
    return fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: dealData.value, 
        payeeEmail: dealData.creatorPayPalEmail, 
      }),
    })
      .then((res) => res.json())
      .then((order) => {
        if (!order.id) throw new Error("Could not create order.");
        return order.id;
      })
      .catch((err) => {
        alert(err.message);
        throw err;
      });
  };

  // 3. VISITOR => capture PayPal order
  const handleApprove = (data) => {
    return fetch("/api/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: data.orderID }),
    })
      .then((res) => res.json())
      .then((captureResult) => {
        console.log("Payment success =>", captureResult);
        alert("Payment successful!");
        onClose?.();
      })
      .catch((err) => {
        console.error("Payment failed =>", err);
        alert("Payment failed.");
      });
  };

  // Renders
  const renderCreatorMode = () => (
    <>
      <Text type="large" role="white" className="text-center">Get Paid First</Text>
      <Text type="small" role="white" className="text-center py-4">
        Add PayPal so visitors can buy your gift card.
      </Text>
      <input
        type="email"
        placeholder="PayPal Email"
        value={paypalEmail}
        onChange={(e) => setPaypalEmail(e.target.value)}
        className="bg-white text-black w-full p-2 text-center rounded-md"
      />

      <Button
        onClick={handleConnectPayPal}
        type="secondary"
        className="w-full rounded-full font-semibold mt-6"
        style={{
          padding: "1rem",
          fontSize: "1.25rem",
          backgroundColor: textColors.white,
          color: textColors.primary,
        }}
      >
        Connect PayPal
      </Button>
    </>
  );

  const renderVisitorMode = () => (
    <>
      <Text type="large" role="white" className="text-center">
        Complete Purchase
      </Text>
      <Text type="small" role="white" className="text-center py-4">
        Pay ${dealData?.value || "0.00"}
      </Text>

      <div className="mt-4 bg-white p-4 rounded-md">
        <PayPalButtons
          createOrder={handleCreateOrder}
          onApprove={handleApprove}
          style={{ layout: "vertical" }}
        />
      </div>
    </>
  );

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="relative w-full max-w-md p-6 rounded-md"
        style={{ backgroundColor: mainColor }}
      >
        {isCreator ? renderCreatorMode() : renderVisitorMode()}

        <button
          className="absolute top-4 right-4 text-white text-2xl"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
