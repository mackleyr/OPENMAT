import React, { useEffect, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';
import FormHeader from './FormHeader';
import Coupon from './Coupon';
import { useCoupon } from '../contexts/CouponContext';
import { useActivity } from '../contexts/ActivityContext';
import { useAuth } from '../contexts/AuthContext';
import Text from '../config/Text';

function CouponForm({ onClose, onSave, initialData }) {
  const { setCouponData } = useCoupon();
  const { addActivity, resetActivitiesForDeal } = useActivity();
  const { profileData, authUser, isOnboarded, profileLoading } = useAuth();

  const initialFormState = initialData || {
    id: null,
    title: '',
    background: require('../assets/background.svg').default,
    expiresHours: null,
    isCustomBackground: false,
    profileImage: null
  };

  const [formState, setFormState] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!formState.id;

  const isUserDataReady = !!(
    authUser && authUser.id && profileData && profileData.name && isOnboarded && !profileLoading
  );

  const isDoneEnabled = !isSubmitting &&
    !isUploading &&
    !!formState.title &&
    !!formState.background &&
    isUserDataReady;

  console.log("CouponForm: Checking readiness:", {
    authUserId: authUser?.id,
    profileName: profileData?.name,
    isOnboarded,
    profileLoading,
    formTitle: formState.title,
    formBackground: formState.background,
    isUserDataReady,
    isDoneEnabled
  });

  useEffect(() => {
    // If user is not onboarded, we should request onboarding via parent callback
    if (authUser && authUser.id && !isOnboarded) {
      console.log("CouponForm: User not onboarded. Redirecting to onboarding...");
      // Instead of navigate(), rely on App.js controlled modal
      // We can pass a prop from App.js to do this or just close form and show onboarding
      onClose(); // Close coupon form to avoid confusion
      alert("You must complete onboarding first.");
      // App.js will handle showing OnboardingForm if needed, so just rely on parent behavior.
    }
  }, [authUser, isOnboarded, onClose]);

  useEffect(() => {
    console.log("CouponForm: Syncing formState to couponData:", formState);
    setCouponData((prev) => ({
      ...prev,
      id: formState.id,
      title: formState.title,
      background: formState.background,
      isCustomBackground: formState.isCustomBackground,
      profileImage: formState.profileImage,
      expires: formState.expiresHours
    }));
  }, [formState, setCouponData]);

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert("No file selected.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be signed in to upload an image.");
      return;
    }

    setIsUploading(true);

    try {
      const cleanedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const uniqueFileName = `${crypto.randomUUID()}-${cleanedFileName}`;
      console.log("Uploading image to:", uniqueFileName);

      const { error: uploadError } = await supabase.storage
        .from("deal-images")
        .upload(uniqueFileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        throw new Error("Failed to upload the image. Please try again.");
      }

      const { data: publicUrlData, error: publicUrlError } = await supabase.storage
        .from("deal-images")
        .getPublicUrl(uniqueFileName);

      if (publicUrlError) {
        console.error("Public URL error:", publicUrlError.message);
        throw new Error("Failed to retrieve the public URL. Please try again.");
      }

      console.log("Image uploaded successfully. Public URL:", publicUrlData.publicUrl);
      setFormState((prev) => ({
        ...prev,
        background: publicUrlData.publicUrl + `?t=${Date.now()}`,
        isCustomBackground: true
      }));
    } catch (err) {
      console.error("Image upload failed:", err.message);
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDone = async () => {
    console.log("handleDone(): Checking form requirements.", {
      title: formState.title,
      background: formState.background,
      isUserDataReady,
      authUserId: authUser?.id,
      isSubmitting,
      isDoneEnabled
    });

    if (!formState.title || !formState.background) {
      alert('Please provide a title and background image.');
      return;
    }

    if (!isUserDataReady) {
      alert('User data not ready. Complete onboarding or check your profile.');
      return;
    }

    setIsSubmitting(true);

    try {
      let expires_at = null;
      if (formState.expiresHours) {
        expires_at = new Date(Date.now() + parseInt(formState.expiresHours, 10) * 3600000).toISOString();
      }

      const dealData = {
        creator_id: authUser.id,
        title: formState.title,
        background: formState.background,
        expires_at,
        creatorName: profileData.name,
      };

      console.log("handleDone(): Creating deal with data:", dealData);
      const { createDeal } = await import('../services/dealsService');
      const deal = await createDeal(dealData);

      if (!deal || !deal.id) {
        throw new Error("No deal returned. Please check createDeal function.");
      }

      console.log("handleDone(): Deal created:", deal);

      if (!isEditing) {
        console.log("handleDone(): Logging activity for new deal.");
        resetActivitiesForDeal(deal.id);
        addActivity({
          name: profileData.name,
          action: 'made deal',
          recency: 'Just now',
          profileImage: profileData.profileImage,
          timestamp: new Date(),
          dealId: deal.id,
          userId: authUser.id,
        });
      }

      alert(`Deal created! Share your link: ${deal.share_link}`);
      onSave(deal);
    } catch (error) {
      console.error('Error creating deal:', error.message);
      alert('Failed to create the deal. Please try again. ' + error.message);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center bg-white"
      style={{
        maxWidth: '100%',
        maxHeight: '85vh',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
      }}
    >
      <FormHeader
        title={isEditing ? 'Edit Coupon' : 'Create Coupon'}
        onBackClick={onClose}
        onDoneClick={handleDone}
        isDoneEnabled={isDoneEnabled}
      />

      <Coupon isInForm={true} couponData={formState} />

      <div className="w-full max-w-lg mt-4 px-4">
        <form className="space-y-4">
          <div className="flex items-center pb-2">
            <Text type="small" role="secondary" className="w-1/3">
              Title
            </Text>
            <input
              type="text"
              placeholder="Make a deal"
              value={formState.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-main focus:outline-none"
              disabled={isSubmitting || isUploading}
            />
          </div>

          <div className="flex items-center pb-2">
            <Text type="small" role="secondary" className="w-1/3">
              Background
            </Text>
            <div className="flex-1 flex items-center space-x-2">
              <label
                className={`py-2 px-4 rounded-lg font-medium text-sm cursor-pointer ${isUploading ? 'bg-gray-400' : 'bg-blue-500'} text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition-colors inline-flex justify-center items-center`}
              >
                {isUploading ? 'Uploading...' : 'Add File'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isSubmitting || isUploading}
                />
              </label>
              {isUploading && <span className="text-sm text-gray-600">Uploading, please wait...</span>}
            </div>
          </div>

          <div className="flex items-center pb-2">
            <Text type="small" role="secondary" className="w-1/3">
              Expires (hours)
            </Text>
            <span>x</span>
            <div className="flex-1 flex items-center space-x-2">
              <input
                type="number"
                placeholder="24"
                value={formState.expiresHours || ''}
                onChange={(e) => handleChange('expiresHours', e.target.value)}
                className="w-[40%] text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-main focus:outline-none"
                disabled={isSubmitting || isUploading}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CouponForm;
