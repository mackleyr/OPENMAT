import React, { useState, useEffect } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { colorScheme } from "../config/Colors";

function SaveSheet({ onClose, userData }) {
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

  const handleDownload = () => {
    alert("Downloading the gift card ...");
  };

  const handleSaveToWallet = () => {
    alert("Saving to wallet ...");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-70 transition-opacity ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl p-4 transition-transform transform bg-white ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          boxShadow: colorScheme.glass.shadow,
        }}
      >
        <button
          onClick={handleClose}
          className="text-black absolute top-4 right-6 text-2xl font-bold"
        >
          ✕
        </button>

        <div className="flex flex-col items-center justify-center space-y-8 py-8">
          <Text type="large" className="text-center font-semibold">
            Save Your Deal
          </Text>

          {/* We can optionally show the user's profile */}
          <Profile size={80} src={userData?.profile_image_url || ""} />

          <div className="w-full max-w-md flex flex-col space-y-4 px-4">
            <button
              onClick={handleDownload}
              className="py-3 px-6 rounded-lg text-white font-semibold"
              style={{ backgroundColor: "#333" }}
            >
              Download
            </button>
            <button
              onClick={handleSaveToWallet}
              className="py-3 px-6 rounded-lg text-white font-semibold"
              style={{ backgroundColor: "#333" }}
            >
              Save to Wallet
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SaveSheet;
