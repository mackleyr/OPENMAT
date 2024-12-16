// OnboardingForm.js
import React, { useState, useContext, useEffect } from 'react';
import Progress from './Progress';
import Text from '../config/Text';
import Profile from './Profile';
import { AuthContext } from '../contexts/AuthContext';
import { OnboardingContext } from '../contexts/OnboardingContext'; // Ensure you have this context available
import { mainColor, textColors } from '../config/Colors';
import { supabase } from '../supabaseClient';

function OnboardingForm({ onComplete }) {
  const { updateUserProfile, setIsOnboarded, setIsVerified, fetchSession } = useContext(AuthContext);
  const { completeOnboarding, pendingAction, setPendingAction } = useContext(OnboardingContext);

  const START_VERIFICATION_URL = "https://api.and.deals/functions/v1/start-verification";
  const CHECK_VERIFICATION_URL = "https://api.and.deals/functions/v1/check-verification";

  const [currentStep, setCurrentStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const steps = [
    {
      title: "What's your Phone Number?",
      subtext: 'Your number unlocks deals.',
      placeholder: '(###) ###-####',
      validation: (value) => /^\(\d{3}\)\s\d{3}-\d{4}$/.test(value),
      inputType: 'phone',
    },
    {
      title: "What's your OTP?",
      subtext: 'Check your phone for the code.',
      placeholder: 'Enter OTP',
      validation: (value) => /^\d{6}$/.test(value),
      inputType: 'otp',
    },
    {
      title: "What's your Name?",
      subtext: 'Your name appears on deals.',
      placeholder: 'Name',
      validation: (value) => /^[a-zA-Z\s]{2,}$/.test(value),
      inputType: 'text',
    },
    {
      title: 'Add your Profile Photo',
      subtext: 'Your photo appears on deals.',
      inputType: 'photo',
    },
  ];

  const currentStepData = steps[currentStep - 1];

  const handleInputChange = (e) => {
    const rawValue = e.target.value;
    if (currentStepData.inputType === 'phone') {
      const formattedNumber = rawValue.replace(/\D/g, '')
        .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      setPhoneNumber(formattedNumber);
    } else if (currentStepData.inputType === 'otp') {
      setOtp(rawValue);
    } else if (currentStepData.inputType === 'text') {
      setName(rawValue);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
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

  const toE164 = (phone) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  };

  const handleNext = async () => {
    try {
      if (currentStep === 1) {
        // Phone step
        if (!steps[0].validation(phoneNumber)) {
          alert("Invalid phone number. Format: (XXX) XXX-XXXX.");
          return;
        }
        const normalized = toE164(phoneNumber);

        await fetch(START_VERIFICATION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: normalized }),
        }).catch(() => null);

        setCurrentStep((prev) => prev + 1);

      } else if (currentStep === 2) {
        // OTP step
        if (!steps[1].validation(otp)) {
          alert("Invalid OTP. 6 digits required.");
          return;
        }
        setIsVerifying(true);
        const normalized = toE164(phoneNumber);

        const checkResp = await fetch(CHECK_VERIFICATION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: normalized, otpCode: otp }),
        }).catch(() => null);

        setIsVerifying(false);

        if (!checkResp || !checkResp.ok) {
          alert("Could not verify phone. Please try again.");
          return;
        }

        const checkData = await checkResp.json();
        if (!checkData.success) {
          alert("Verification failed. Please try again.");
          return;
        }

        const { email, password } = checkData;
        console.log("Attempting sign-in with verified credentials...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        console.log("Sign-in attempt response:", { signInData, signInError });

        if (signInError) {
          console.error("Sign-in error:", signInError.message);
          alert("Sign-in failed. Please contact support.");
          return;
        }

        console.log("User signed in. Session:", signInData.session);
        await fetchSession();

        setCurrentStep((prev) => prev + 1);

      } else if (currentStep === 3) {
        // Name step
        if (!steps[2].validation(name)) {
          alert("Name must be at least 2 letters.");
          return;
        }
        setCurrentStep((prev) => prev + 1);

      } else if (currentStep === 4) {
        // Profile photo step
        if (!profilePhoto) {
          alert("Please upload a profile photo.");
          return;
        }

        // Update user profile in DB
        console.log("OnboardingForm: Updating user profile with name/phone/photo");
        await updateUserProfile({
          phone_number: phoneNumber,
          name: name,
          profile_image_url: profilePhoto,
        });

        setIsVerified(true);
        setIsOnboarded(true);

        // Complete onboarding in OnboardingContext
        await completeOnboarding();

        // After onboarding is complete, call onComplete()
        onComplete();
      }

    } catch (error) {
      console.error("Error during onboarding step:", error.message);
      alert("An unexpected error occurred. Please try again.");

      // If onboarding fails, decide what to do.
      // Here, we just stay on the same step. You could also allow retries or go back a step.
    }
  };

  const isValid = currentStepData.validation
    ? currentStepData.inputType === 'phone'
      ? phoneNumber.length === 14 && steps[0].validation(phoneNumber)
      : currentStepData.validation(
          currentStepData.inputType === 'otp'
            ? otp
            : currentStepData.inputType === 'text'
              ? name
              : ''
        )
    : !!profilePhoto; // For the photo step, just check if a photo is set.

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

        {(currentStepData.inputType === 'phone' ||
          currentStepData.inputType === 'otp' ||
          currentStepData.inputType === 'text') && (
          <div className="flex items-center w-full max-w-md mx-auto">
            <Text type="large" role="white" className="w-full text-center">
              <input
                type={currentStepData.inputType === 'phone' ? 'tel' : 'text'}
                value={
                  currentStepData.inputType === 'phone'
                    ? phoneNumber
                    : currentStepData.inputType === 'otp'
                    ? otp
                    : name
                }
                onChange={handleInputChange}
                placeholder={currentStepData.placeholder}
                className="bg-transparent border-none outline-none w-full text-center"
                style={{ color: textColors.white }}
              />
            </Text>
          </div>
        )}

        {currentStepData.inputType === 'photo' && (
          <div
            className="flex items-center justify-center mt-4 relative cursor-pointer"
            style={{ height: '20vh', width: '20vh', borderRadius: '50%', overflow: 'hidden' }}
            onClick={() => document.getElementById('photoInput').click()}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                style={{ objectFit: 'cover', height: '100%', width: '100%' }}
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
            disabled={isVerifying || !isValid || isUploading}
            className="w-full rounded-full font-semibold transition-all duration-150"
            style={{
              backgroundColor: isValid && !isUploading && !isVerifying ? textColors.white : 'rgba(255, 255, 255, 0.2)',
              color: isValid && !isUploading && !isVerifying ? textColors.primary : 'rgba(255, 255, 255, 0.2)',
              padding: 'clamp(1.25rem, 2.5%, 3rem)',
              fontSize: 'clamp(1.25rem, 2vw, 3rem)',
              textAlign: 'center',
              fontWeight: 'semibold',
            }}
          >
            {currentStep === 2 && isVerifying ? 'Verifying...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingForm;
