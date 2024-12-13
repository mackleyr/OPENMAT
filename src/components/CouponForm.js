import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import FormHeader from './FormHeader';
import Coupon from './Coupon';
import { useCoupon } from '../contexts/CouponContext';
import { useActivity } from '../contexts/ActivityContext';
import { useAuth } from '../contexts/AuthContext';
import { createDeal, generateShareLink } from '../services/dealsService';
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
  };

  const [formState, setFormState] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!formState.id;

  const isUserDataReady = authUser && authUser.id && profileData && profileData.name && isOnboarded && !profileLoading;

  useEffect(() => {
    console.log("CouponForm: Syncing formState to couponData:", formState);
    setCouponData((prev) => ({ ...prev, ...formState }));
  }, [formState, setCouponData]);

  const handleChange = (field, value) => {
    console.log(`CouponForm: handleChange for field ${field} with value:`, value);
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.error("CouponForm.handleImageUpload(): No file selected.");
      alert("No file selected.");
      return;
    }

    console.log("CouponForm.handleImageUpload(): Uploading file:", file.name);

    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be signed in to upload an image.");
      return;
    }

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("deal-images")
        .upload(`public/${file.name}`, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        throw new Error("Failed to upload the image. Please try again.");
      }

      console.log("CouponForm.handleImageUpload(): Upload Success:", uploadData);

      const { data: publicUrlData, error: publicUrlError } = await supabase.storage
        .from("deal-images")
        .getPublicUrl(`public/${file.name}`);

      if (publicUrlError) {
        console.error("Public URL error:", publicUrlError.message);
        throw new Error("Failed to retrieve the public URL. Please try again.");
      }

      console.log("CouponForm.handleImageUpload(): Public URL Retrieved:", publicUrlData);
      setFormState((prev) => ({
        ...prev,
        background: publicUrlData.publicUrl,
        isCustomBackground: true
      }));
    } catch (err) {
      console.error("Image upload failed:", err.message);
      alert(err.message);
    }
  };

  const handleDone = async () => {
    console.log("CouponForm.handleDone(): Attempting to create/update deal.");
    if (!formState.title || !formState.background) {
      alert('Please provide a title and background image.');
      return;
    }

    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) {
      console.warn("CouponForm.handleDone(): User session invalid.");
      alert("You must be signed in to create a deal.");
      return;
    }

    if (!authUser || !authUser.id) {
      alert('You must be signed in to create a deal.');
      return;
    }

    setIsSubmitting(true);

    try {
      let expires_at = null;
      if (formState.expiresHours) {
        expires_at = new Date(Date.now() + parseInt(formState.expiresHours, 10) * 60 * 60 * 1000).toISOString();
      }

      const dealData = {
        creator_id: authUser.id,
        title: formState.title,
        background: formState.background,
        expires_at: expires_at,
      };

      console.log("CouponForm.handleDone(): Creating deal with data:", dealData);
      const deal = await createDeal(dealData);

      console.log("CouponForm.handleDone(): Deal created:", deal);
      const shareLink = await generateShareLink(deal.id, authUser.id);
      console.log("CouponForm.handleDone(): Share link generated:", shareLink);

      if (!isEditing) {
        console.log("CouponForm.handleDone(): Logging activity for new deal.");
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

      alert(`Deal created! Share your link: ${shareLink}`);
      onSave(deal);
    } catch (error) {
      console.error('Error creating deal:', error.message);
      alert('Failed to create the deal. Please try again.');
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
        isDoneEnabled={!isSubmitting && !!formState.title && isUserDataReady}
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
            />
          </div>

          <div className="flex items-center pb-2">
            <Text type="small" role="secondary" className="w-1/3">
              Background
            </Text>
            <div className="flex-1">
              <label
                className="py-2 px-4 rounded-lg font-medium text-sm cursor-pointer bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition-colors inline-flex justify-center items-center"
              >
                Add File
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center pb-2">
            <Text type="small" role="secondary" className="w-1/3">
              Expires (hours)
            </Text>
            <div className="flex-1 flex items-center space-x-2">
              <input
                type="number"
                placeholder="24"
                value={formState.expiresHours || ''}
                onChange={(e) => handleChange('expiresHours', e.target.value)}
                className="w-[40%] text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-main focus:outline-none"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CouponForm;
