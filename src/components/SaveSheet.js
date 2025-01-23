// src/components/SaveSheet.jsx
import React, { useState, useEffect } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { colorScheme } from "../config/Colors";
import html2canvas from "html2canvas";

function SaveSheet({ onClose, userData, dealData }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleDownload = async () => {
    try {
      const cardElement = document.getElementById("downloadableCard");
      if (!cardElement) {
        alert("No card found to download!");
        return;
      }
      const canvas = await html2canvas(cardElement);
      const dataURL = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "MyGiftCard.png";
      link.click();
    } catch (err) {
      console.error("Download error =>", err);
      alert("Failed to download card.");
    }
  };

  const handleEmail = async () => {
    try {
      const userEmail = userData?.paypalEmail || userData?.email;
      if (!userEmail) {
        alert("No valid email found for your account.");
        return;
      }

      // STUB - implement on server
      const res = await fetch("/api/email-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          dealTitle: dealData?.title,
          dealValue: dealData?.value,
        }),
      });

      if (!res.ok) {
        throw new Error("Email request failed");
      }

      alert("Your card was emailed!");
    } catch (err) {
      console.error("Email me error =>", err);
      alert("Unable to email your card.");
    }
  };

  return (
    <>
      {/* BACKDROP */}
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-70 transition-opacity ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      
      {/* MAIN SHEET */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl p-4 transition-transform transform bg-white ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ boxShadow: colorScheme.glass.shadow }}
      >
        <button
          onClick={handleClose}
          className="text-black absolute top-4 right-6 text-2xl font-bold"
        >
          ✕
        </button>

        {/* HIDDEN CARD PREVIEW FOR DOWNLOAD */}
        <div
          id="downloadableCard"
          style={{
            display: "none",
            width: "400px",
            padding: "20px",
            background: "#f7f7f7",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: 10 }}>
            {dealData?.title || "Your Deal"}
          </div>
          <div style={{ marginBottom: 10 }}>
            Value: {dealData?.value || "Unknown"}
          </div>
          <div>Purchased by {userData?.name || "Anonymous"}</div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-8 py-8">
          <Text type="large" className="text-center font-semibold">
            Your Deal is Ready!
          </Text>

          <Profile size={80} src={userData?.profilePhoto || ""} />

          <div className="w-full max-w-md flex flex-col space-y-4 px-4">
            <button
              onClick={handleDownload}
              className="py-3 px-6 rounded-lg text-white font-semibold"
              style={{ backgroundColor: "#333" }}
            >
              Download Card
            </button>
            <button
              onClick={handleEmail}
              className="py-3 px-6 rounded-lg text-white font-semibold"
              style={{ backgroundColor: "#333" }}
            >
              Email Me
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SaveSheet;
