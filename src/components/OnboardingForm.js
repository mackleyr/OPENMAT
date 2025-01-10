import React, { useState } from "react";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";
import { sendVerificationCode, checkVerificationCode } from "../services/twilioClient";

/**
 * OnboardingForm flow:
 * Step 1: Connect PayPal
 * Step 2: Phone + verification
 * Step 3: Name
 * Step 4: Photo
 *
 * We removed the "Phone Verified! Tap next." screen.
 * The user must click "Send Code" or "Verify" on step 2.
 */

function OnboardingForm({ onComplete }) {
  // Steps
  const steps = [
    {
      title: "Get Paid",
      subtext: "Connect PayPal to receive payments.",
      inputType: "paypal", // new step
    },
    {
      title: "What's your Phone Number?",
      subtext: "Your number unlocks deals.",
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

  const [currentStep, setCurrentStep] = useState(1);
  const currentStepData = steps[currentStep - 1];

  // 1) PayPal connect (placeholder)
  const [paypalEmail, setPaypalEmail] = useState("");

  // 2) Phone + verification
  const [phone, setPhone] = useState("");
  const [showCodeField, setShowCodeField] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // 3) Name
  const [name, setName] = useState("");

  // 4) Photo
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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

  // PayPal OAuth (placeholder).
  // In reality, you'd redirect to PayPal or open a popup to do actual OAuth.
  const handleConnectPayPal = async () => {
    // Just pretend we got "someuser@paypal.com" from OAuth
    const fakeEmailFromOAuth = "someuser@paypal.com";
    setPaypalEmail(fakeEmailFromOAuth);
    alert(`PayPal connected with: ${fakeEmailFromOAuth}`);
  };

  // Twilio logic
  const handleSendOrCheckCode = async () => {
    if (!showCodeField) {
      // "Send code"
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
      // "Verify code"
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

  // Validation
  const isValid = () => {
    switch (currentStepData.inputType) {
      case "paypal":
        // Let them proceed after they've connected?
        // If we require an actual PayPal email, check it:
        return paypalEmail.length > 3;
      case "phone":
        // Must be verified
        return isVerified;
      case "text":
        // Name
        return name.trim().length >= 2;
      case "photo":
        return !!profilePhoto;
      default:
        return false;
    }
  };

  // Next
  const handleNext = async () => {
    if (currentStepData.inputType === "paypal") {
      // If we haven't connected PayPal yet, do that first:
      if (!paypalEmail) {
        alert("Please connect PayPal first!");
        return;
      }
    } else if (currentStepData.inputType === "phone" && !isVerified) {
      // If phone is not verified, attempt to send or verify code
      await handleSendOrCheckCode();
      return;
    }

    // Move to next step or finish
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Completed => pass data
    onComplete?.({
      paypalEmail,
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
        {/* Title */}
        <Text type="large" role="white" className="text-center">
          {currentStepData.title}
        </Text>
        {/* Subtext */}
        {currentStepData.subtext && (
          <Text type="small" role="white" className="text-center py-[2.5%]">
            {currentStepData.subtext}
          </Text>
        )}

        {/* Step 1 => "paypal" */}
        {currentStepData.inputType === "paypal" && (
          <button
            onClick={handleConnectPayPal}
            className="mt-8 px-4 py-2 rounded-full font-semibold"
            style={{
              backgroundColor: textColors.white,
              color: textColors.primary,
              fontSize: "1.25rem",
            }}
          >
            Connect PayPal
          </button>
        )}

        {/* Step 2 => phone + code */}
        {currentStepData.inputType === "phone" && (
          <>
            {!showCodeField && !isVerified && (
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(123) 456-7890"
                className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
              />
            )}
            {showCodeField && !isVerified && (
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
            {isVerified && (
              <Text type="medium" role="white" className="mt-4">
                Phone Verified!
              </Text>
            )}
          </>
        )}

        {/* Step 3 => name */}
        {currentStepData.inputType === "text" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="bg-transparent border-none outline-none w-full text-center text-white mt-4 text-2xl"
          />
        )}

        {/* Step 4 => photo */}
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

      {/* Next or Complete Button */}
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
          {currentStep < steps.length ? "Next" : "Complete"}
        </button>
      </div>
    </div>
  );
}

export default OnboardingForm;
