import React, { useState } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";
// We'll assume these exist in your code
import { sendVerificationCode, checkVerificationCode } from "../services/twilioClient";

function OnboardingForm({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);

  // phone with parentheses => e.g. "(123) 456-7890"
  const [phone, setPhone] = useState("");
  const [showCodeField, setShowCodeField] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // name + photo
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // steps
  const steps = [
    {
      title: isVerified ? "Phone Verified!" : "What's your Phone Number?",
      subtext: isVerified ? "Tap next." : "Your number unlocks deals.",
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
   * formatPhone():
   * 1) Strip out all non-digits
   * 2) Limit to 10 digits
   * 3) Insert parentheses and dash => (###) ###-####
   */
  function formatPhone(value) {
    let digits = value.replace(/\D/g, "");
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    if (digits.length <= 3) {
      return `(${digits}`;
    } else if (digits.length <= 6) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
    } else {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
  }

  const handlePhoneChange = (rawValue) => {
    const formatted = formatPhone(rawValue);
    setPhone(formatted);
  };

  const isValid = () => {
    if (currentStepData.inputType === "phone") {
      const digits = phone.replace(/\D/g, "");
      return digits.length === 10;
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
    if (!showCodeField) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length !== 10) {
        alert("Please enter exactly 10 digits for a US phone.");
        return;
      }
      const e164 = `+1${digits}`;
      try {
        await sendVerificationCode(e164);
        setShowCodeField(true);
      } catch (err) {
        alert(`Error sending verification code: ${err.message}`);
      }
    } else {
      const digits = phone.replace(/\D/g, "");
      const e164 = `+1${digits}`;
      try {
        const success = await checkVerificationCode(e164, verificationCode);
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
    // If step=1 & not verified => Twilio logic
    if (currentStep === 1 && !isVerified) {
      await handleSendOrCheckCode();
      return;
    }

    // Move to next step
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Completed => pass data
    onComplete?.({
      phone: phone.replace(/\D/g, ""),
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
            placeholder="(123) 456-7890"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}
        {currentStepData.inputType === "phone" && showCodeField && !isVerified && (
          <div className="flex flex-col mt-4 items-center">
            <Text type="small" role="white">
              Enter the 6-digit code:
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
