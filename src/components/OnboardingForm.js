import React, { useState } from "react";
import Progress from "./Progress";
import Text from "../config/Text";
import Profile from "./Profile";
import { mainColor, textColors } from "../config/Colors";
import { useCard } from "../contexts/CardContext";

function OnboardingForm({ onComplete }) {
  const { setCardData } = useCard();
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Simple validations
  const nameValidation = (value) => /^[A-Za-z ]{2,}$/.test(value.trim());
  const phoneValidation = (value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10;
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    const clipped = digits.slice(0, 10);
    if (clipped.length <= 3) return clipped;
    if (clipped.length <= 6) return `(${clipped.slice(0, 3)}) ${clipped.slice(3)}`;
    return `(${clipped.slice(0, 3)}) ${clipped.slice(3, 6)}-${clipped.slice(6)}`;
  };

  const steps = [
    {
      title: "What's your Name?",
      subtext: "Your name appears on deals.",
      placeholder: "Name",
      inputType: "text",
      validation: nameValidation,
    },
    {
      title: "What's your Phone Number?",
      subtext: "Your number unlocks deals.",
      placeholder: "(123) 456-7890",
      inputType: "phone",
      validation: phoneValidation,
    },
    {
      title: "Add your Profile Photo",
      subtext: "Your photo appears on deals.",
      inputType: "photo",
    },
  ];

  const currentStepData = steps[currentStep - 1];

  // Input change handling
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (currentStepData.inputType === "text") {
      setName(value);
    } else if (currentStepData.inputType === "phone") {
      setPhone(formatPhone(value));
    }
  };

  // Photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const isValid = () => {
    if (currentStepData.inputType === "text") {
      return nameValidation(name);
    } else if (currentStepData.inputType === "phone") {
      return phoneValidation(phone);
    } else if (currentStepData.inputType === "photo") {
      return !!profilePhoto;
    }
    return false;
  };

  // Go to next step or complete
  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completed all steps: build userData
      const cleanName = name.trim();
      const cleanPhone = phone.replace(/\D/g, "");
      const userData = {
        name: cleanName,
        phone: cleanPhone,
        profilePhoto,
      };
      // Merge into global cardData
      setCardData((prev) => ({
        ...prev,
        name: cleanName,
        phone: cleanPhone,
        profilePhoto,
      }));
      // Minor Tweak: explicitly pass userData to onComplete
      onComplete?.(userData);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center py-[7.5%]"
      style={{ backgroundColor: mainColor }}
    >
      <div className="w-full">
        <Progress currentStep={currentStep} totalSteps={steps.length} />
      </div>

      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg">
        <Text type="large" role="white" className="text-center">
          {currentStepData.title}
        </Text>
        {currentStepData.subtext && (
          <Text type="small" role="white" className="text-center py-[2.5%]">
            {currentStepData.subtext}
          </Text>
        )}

        {["text", "phone"].includes(currentStepData.inputType) && (
          <div className="flex items-center w-full max-w-md mx-auto">
            <Text type="large" role="white" className="w-full text-center">
              <input
                type={currentStepData.inputType === "phone" ? "tel" : "text"}
                value={currentStepData.inputType === "phone" ? phone : name}
                onChange={handleInputChange}
                placeholder={currentStepData.placeholder}
                className="bg-transparent border-none outline-none w-full text-center"
                style={{ color: textColors.white }}
              />
            </Text>
          </div>
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
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        )}
      </div>

      <div className="w-full max-w-md">
        <div className="w-full rounded-xl bg-transparent py-[2%] px-[5%]">
          <button
            onClick={handleNext}
            disabled={!isValid() || isUploading}
            className="w-full rounded-full font-semibold transition-all duration-150"
            style={{
              backgroundColor:
                isValid() && !isUploading
                  ? textColors.white
                  : "rgba(255, 255, 255, 0.2)",
              color:
                isValid() && !isUploading
                  ? textColors.primary
                  : "rgba(255, 255, 255, 0.2)",
              padding: "clamp(1.25rem, 2.5%, 3rem)",
              fontSize: "clamp(1.25rem, 2vw, 3rem)",
              textAlign: "center",
            }}
          >
            {currentStep < steps.length ? "Next" : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingForm;
