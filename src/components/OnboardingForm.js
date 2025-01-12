// src/components/OnboardingForm.jsx
import React, { useState, useEffect } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";

/**
 * A minimal form for capturing PayPal email + name/photo,
 * but the "PayPal" step is a real OAuth handshake, no placeholders.
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

  const [currentStep, setCurrentStep] = useState(1);
  const currentStepData = steps[currentStep - 1];

  // Verified PayPal data from OAuth callback
  const [paypalEmail, setPaypalEmail] = useState("");
  // Additional user data
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // If returning from /api/paypal/oauth with ?paypal_email=...&name=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedEmail = params.get("paypal_email");
    const returnedName = params.get("name");
    if (returnedEmail) setPaypalEmail(returnedEmail);
    if (returnedName) setName(returnedName);
  }, []);

  // Step validation
  const isValid = () => {
    if (currentStepData.inputType === "paypal") {
      // We rely on the actual verified PayPal email
      return paypalEmail.trim().length > 3;
    }
    if (currentStepData.inputType === "text") {
      return name.trim().length >= 2;
    }
    if (currentStepData.inputType === "photo") {
      return !!profilePhoto;
    }
    return false;
  };

  // Bottom button
  const buttonLabel = () => {
    if (currentStep < steps.length) return "Next";
    return "Complete";
  };

  const handleBottomButton = () => {
    // If not last step => next
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }
    // final => pass data
    onComplete?.({
      paypalEmail: paypalEmail.trim(),
      name: name.trim(),
      profilePhoto,
    });
  };

  const handlePayPalSignIn = () => {
    // Real OAuth: calls your server route
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

        {/* Step 1 => PayPal OAuth */}
        {currentStepData.inputType === "paypal" && (
          <div className="mt-4 flex flex-col items-center">
            {!paypalEmail && (
              <button
                onClick={handlePayPalSignIn}
                className="bg-white text-black px-4 py-2 rounded-full font-semibold"
              >
                Sign in with PayPal
              </button>
            )}
            {paypalEmail && (
              <Text type="medium" role="white" className="text-center mt-2">
                Verified PayPal: <br />
                <span style={{ color: textColors.tertiary }}>{paypalEmail}</span>
              </Text>
            )}
          </div>
        )}

        {/* Step 2 => Name */}
        {currentStepData.inputType === "text" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {/* Step 3 => Photo */}
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

      <div className="w-full max-w-md px-4">
        <button
          onClick={handleBottomButton}
          disabled={!isValid() || isUploading}
          className="w-full rounded-full font-semibold transition-all duration-150 text-center"
          style={{
            backgroundColor:
              isValid() && !isUploading ? textColors.white : "rgba(255, 255, 255, 0.2)",
            color:
              isValid() && !isUploading ? textColors.primary : "rgba(255, 255, 255, 0.2)",
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
