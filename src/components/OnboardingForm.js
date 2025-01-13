import React, { useState, useEffect } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";

/**
 * Minimal form for capturing user email, name, and photo
 * (We’re temporarily skipping real PayPal OAuth.)
 */
function OnboardingForm({ onComplete }) {
  // Steps
  const steps = [
    {
      title: "Enter Your Email",
      subtext: "We use this for notifications & payments.",
      inputType: "paypal", // rename if you prefer, but we keep "paypal" for simplicity
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

  // Form data
  const [paypalEmail, setPaypalEmail] = useState("");
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // If we had ?paypal_email=..., ?name=... in the URL, parse them
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedEmail = params.get("paypal_email");
    const returnedName = params.get("name");

    if (returnedEmail) {
      setPaypalEmail(returnedEmail);
      setCurrentStep(2); // skip to name step
    }
    if (returnedName) {
      setName(returnedName);
    }
  }, []);

  const currentStepData = steps[currentStep - 1];

  // Validation per step
  const isValid = () => {
    if (currentStepData.inputType === "paypal") {
      // NOW we require user to type an email
      return paypalEmail.trim().length > 4; // or any minimal check
    }
    if (currentStepData.inputType === "text") {
      return name.trim().length >= 2; 
    }
    if (currentStepData.inputType === "photo") {
      return !!profilePhoto;
    }
    return false;
  };

  // Button label
  const buttonLabel = () => {
    if (currentStep < steps.length) return "Next";
    return "Complete";
  };

  // The main click
  const handleBottomButton = () => {
    // If not on the last step => go next
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }
    // If last step => pass data
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

        {/* Step #1 => user manually enters email */}
        {currentStepData.inputType === "paypal" && (
          <input
            type="email"
            placeholder="Your Email"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {/* Step #2 => name */}
        {currentStepData.inputType === "text" && (
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

      {/* Bottom Button => "Next" or "Complete" */}
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
