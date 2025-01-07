import React, { useState } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";
// Suppose we have these from earlier
import { sendVerificationCode, checkVerificationCode } from "../services/twilioClient";

function OnboardingForm({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);

  // phone input
  const [phone, setPhone] = useState("");
  const [hasDefaulted, setHasDefaulted] = useState(false);

  // Twilio code fields
  const [showCodeField, setShowCodeField] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Name + Photo
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const steps = [
    {
      title: isVerified ? "Phone Verified!" : "What's your Phone Number?",
      subtext: isVerified
        ? "Congrats! Your phone is verified."
        : "Your number unlocks deals.",
      inputType: "phone",
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
  const currentStepData = steps[currentStep - 1];

  /**
   * Handle phone input changes.
   * If the user hasn't typed yet (phone === ""), we insert '+1' automatically.
   * Otherwise, let them type freely.
   */
  const handlePhoneChange = (value) => {
    if (!hasDefaulted && !phone) {
      // This is the first keystroke, phone was empty.
      setPhone("+1" + value);  // e.g. if they typed "2", now phone => "+12"
      setHasDefaulted(true);
    } else {
      setPhone(value);
    }
  };

  /**
   * This is just a convenience check for enabling/disabling "Send Code"/"Verify"/"Next" buttons.
   */
  const isValid = () => {
    if (currentStepData.inputType === "phone") {
      return phone.trim().length >= 2; // minimal check, or do a phone length check
    }
    if (currentStepData.inputType === "text") {
      return name.trim().length >= 2;
    }
    if (currentStepData.inputType === "photo") {
      return !!profilePhoto;
    }
    return false;
  };

  const handleSendOrCheckCode = async () => {
    // Example E.164 handling: if phone starts with '+1', that might be enough for US.
    // If you're only dealing with US numbers, you can assume phone is already '+1XXXXXXXXXX'.
    // Or do extra checks if phone doesn't have '+1' at the front.
    if (!showCodeField) {
      // 1) send code
      try {
        await sendVerificationCode(phone);
        setShowCodeField(true);
      } catch (err) {
        alert(`Error sending verification code: ${err.message}`);
      }
    } else {
      // 2) check code
      try {
        const success = await checkVerificationCode(phone, verificationCode);
        if (success) {
          setIsVerified(true);
          setShowCodeField(false);
          setVerificationCode("");
        } else {
          alert("Code incorrect or expired");
        }
      } catch (err) {
        alert(`Error verifying code: ${err.message}`);
      }
    }
  };

  const handleNext = async () => {
    // If step=1 (phone) & not verified => do Twilio logic
    if (currentStep === 1 && !isVerified) {
      await handleSendOrCheckCode();
      return; // do not proceed
    }

    // Move steps normally
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Completed => pass data
    onComplete?.({
      phone: phone.trim(), // If US only, phone is already +1XXXXXXXXXX
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

        {/* Step 1 => phone + code */}
        {currentStepData.inputType === "phone" && !showCodeField && (
          <input
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+11234567890"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {currentStepData.inputType === "phone" && showCodeField && !isVerified && (
          <div className="flex flex-col mt-4 items-center">
            <Text type="small" role="white">
              Enter the 6-digit code we sent:
            </Text>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              className="bg-transparent border-none outline-none w-full text-center text-white mt-2 text-2xl"
            />
          </div>
        )}

        {/* Step 2 => name */}
        {currentStepData.inputType === "text" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {/* Step 3 => photo */}
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
          onClick={handleNext}
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
          {(() => {
            if (currentStep === 1 && !isVerified) {
              return showCodeField ? "Verify" : "Send Code";
            }
            if (currentStep < steps.length) return "Next";
            return "Complete";
          })()}
        </button>
      </div>
    </div>
  );
}

export default OnboardingForm;
