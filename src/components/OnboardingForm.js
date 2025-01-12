// src/components/OnboardingForm.jsx
import React, { useState, useEffect } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";

/**
 * Minimal form for capturing PayPal (via real OAuth), name, and photo.
 */
function OnboardingForm({ onComplete }) {
  const steps = [
    {
      title: "Connect your PayPal",
      subtext: "to receive payments.",
      inputType: "paypal",
    },
    {
      title: "What's your Name?",
      subtext: "Your name appears on deals.",
      inputType: "text",
    },
    {
      title: "Add your Profile Photo",
      subtext: "Your photo appears on deals.",
      inputType: "photo",
    },
  ];

  // Current step in the onboarding flow
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [paypalEmail, setPaypalEmail] = useState("");
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // On mount, check if we have ?paypal_email=..., ?name=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedEmail = params.get("paypal_email");
    const returnedName = params.get("name");

    if (returnedEmail) {
      setPaypalEmail(returnedEmail);
      // Because step #1 is effectively "Connect PayPal," skip to step #2
      setCurrentStep(2);
    }
    if (returnedName) {
      setName(returnedName);
    }
  }, []);

  const currentStepData = steps[currentStep - 1];

  // Checks if the user can advance
  const isValid = () => {
    if (currentStepData.inputType === "paypal") {
      return paypalEmail.trim().length > 3; // Means we have a PayPal email
    }
    if (currentStepData.inputType === "text") {
      return name.trim().length >= 2;
    }
    if (currentStepData.inputType === "photo") {
      return !!profilePhoto;
    }
    return false;
  };

  // Button label changes by step
  const buttonLabel = () => {
    if (currentStepData.inputType === "paypal" && !paypalEmail) {
      return "Connect PayPal";
    }
    if (currentStep < steps.length) return "Next";
    return "Complete";
  };

  // The main bottom button
  const handleBottomButton = () => {
    // Step #1 => if no PayPal email, we do real OAuth
    if (currentStepData.inputType === "paypal" && !paypalEmail) {
      handlePayPalConnect();
      return;
    }

    // If not on the last step, go next
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // If last step => pass data up
    onComplete?.({
      paypalEmail: paypalEmail.trim(),
      name: name.trim(),
      profilePhoto,
    });
  };

  // Actually perform the PayPal OAuth
  const handlePayPalConnect = () => {
    // Kicks off the handshake at /api/paypal/oauth
    window.location.href = "/api/paypal/oauth";
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center py-[7.5%]"
      style={{ backgroundColor: mainColor }}
    >
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg">
        <Text type="large" role="white" className="text-center">
          {currentStepData.title}
        </Text>
        {currentStepData.subtext && (
          <Text type="small" role="white" className="text-center py-[2.5%]">
            {currentStepData.subtext}
          </Text>
        )}

        {/* If we're on step #1 but have a PayPal email, show it */}
        {currentStepData.inputType === "paypal" && paypalEmail && (
          <Text type="medium" role="white" className="text-center mt-4">
            Verified PayPal: {paypalEmail}
          </Text>
        )}

        {/* Step #2 => name input */}
        {currentStepData.inputType === "text" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {/* Step #3 => photo */}
        {currentStepData.inputType === "photo" && (
          <div
            className="flex items-center justify-center mt-4 relative cursor-pointer"
            style={{
              height: "20vh",
              width: "20vh",
              borderRadius: "50%",
              overflow: "hidden",
            }}
            onClick={() => document.getElementById("photoInput").click()}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                style={{ objectFit: "cover", height: "100%", width: "100%" }}
              />
            ) : (
              <Profile size={window.innerHeight / 4} src={profilePhoto} />
            )}
            <input
              id="photoInput"
              type="file"
              accept="image/*"
              onChange={(e) => {
                setIsUploading(true);
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setProfilePhoto(reader.result);
                    setIsUploading(false);
                  };
                  reader.readAsDataURL(file);
                } else {
                  setIsUploading(false);
                }
              }}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Single bottom button => "Connect PayPal" or "Next" or "Complete" */}
      <div className="w-full max-w-md px-4">
        <button
          onClick={handleBottomButton}
          disabled={!isValid() || isUploading}
          className="w-full rounded-full font-semibold transition-all duration-150 text-center"
          style={{
            backgroundColor:
              isValid() && !isUploading ? textColors.white : "rgba(255,255,255,0.2)",
            color:
              isValid() && !isUploading ? textColors.primary : "rgba(255,255,255,0.2)",
            padding: "1rem",
            fontSize: "1.25rem",
            marginTop: "2rem",
          }}
        >
          {buttonLabel()}
        </button>
      </div>
    </div>
  );
}

export default OnboardingForm;
