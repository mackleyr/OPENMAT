// src/components/OnboardingForm.jsx
import React, { useState } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";

/**
 * A minimal form for capturing PayPal email + name/photo
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

  // 1) PayPal
  const [paypalEmail, setPaypalEmail] = useState("");

  // 2) Name
  const [name, setName] = useState("");

  // 3) Photo
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isValid = () => {
    if (currentStepData.inputType === "paypal") {
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

        {currentStepData.inputType === "paypal" && (
          <input
            type="email"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            placeholder="PayPal Email"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {currentStepData.inputType === "text" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

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

      {/* The bottom button */}
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
