// src/components/OnboardingForm.jsx
import React, { useState, useEffect } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";

/**
 * Minimal form for capturing PayPal (via real OAuth), name, and photo.
 */
function OnboardingForm({ onComplete }) {
  // Define each step
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

  // Current step (1-based)
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [paypalEmail, setPaypalEmail] = useState("");
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // On mount => parse ?paypal_email=..., ?name=... from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedEmail = params.get("paypal_email");
    const returnedName = params.get("name");

    if (returnedEmail) {
      setPaypalEmail(returnedEmail);
      // Because step #1 is “Connect PayPal,” skip to step #2 if we have an email
      setCurrentStep(2);
    }
    if (returnedName) {
      setName(returnedName);
    }
  }, []);

  const currentStepData = steps[currentStep - 1];

  /**
   * Determines whether we enable or disable the bottom button
   * based on the current step’s inputType.
   */
  const isValid = () => {
    if (currentStepData.inputType === "paypal") {
      // Step #1 => We ALWAYS enable so the user can click “Connect PayPal.”
      // They won't have a PayPal email yet at this point.
      return true;
    }
    if (currentStepData.inputType === "text") {
      return name.trim().length >= 2; // e.g. require at least 2 chars
    }
    if (currentStepData.inputType === "photo") {
      return !!profilePhoto; // require a photo
    }
    return false;
  };

  /**
   * Decides how the bottom button is labeled
   * e.g. "Connect PayPal," "Next," or "Complete"
   */
  const buttonLabel = () => {
    // Step 1 => If no verified email => say “Connect PayPal”
    if (currentStepData.inputType === "paypal" && !paypalEmail) {
      return "Connect PayPal";
    }
    // If not last step => "Next"
    if (currentStep < steps.length) return "Next";

    // If last step => "Complete"
    return "Complete";
  };

  /**
   * Single bottom button click logic
   */
  const handleBottomButton = () => {
    // If step #1 => we attempt PayPal connect if we have no paypalEmail
    if (currentStepData.inputType === "paypal" && !paypalEmail) {
      handlePayPalConnect();
      return;
    }

    // If not on the last step => go next
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // If last step => call onComplete with user data
    onComplete?.({
      paypalEmail: paypalEmail.trim(),
      name: name.trim(),
      profilePhoto,
    });
  };

  /**
   * Actually triggers the PayPal OAuth flow.
   */
  const handlePayPalConnect = () => {
    // Redirect the user to your PayPal OAuth endpoint
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

        {/* Step #1 => if we do have PayPal email, show it; otherwise user can click Connect */}
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

        {/* Step #3 => profile photo */}
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

      {/* The bottom button => “Connect PayPal,” “Next,” or “Complete” */}
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
