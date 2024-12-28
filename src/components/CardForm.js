// src/components/CardForm.jsx

import React, { useState } from 'react';
import Card from './Card';
import Text from '../config/Text';
import Button from './Button';
import { useCard } from '../contexts/CardContext';
import { createDeal, updateDeal } from '../services/dealsService';
import { upsertUser } from '../services/usersService';

function CardForm({ onClose, onSave, initialData = {} }) {
  const { cardData, setCardData } = useCard();

  // Local form state for real-time preview
  const [formState, setFormState] = useState({
    id: initialData.id ?? null,
    expiresHours: initialData.expiresHours ?? null,
    dealValue: initialData.dealValue ?? '',
    dealTitle: initialData.dealTitle ?? '',
    dealDescription: initialData.dealDescription ?? '',
    dealImage: initialData.dealImage ?? null,
    name: cardData?.name || '',
    profilePhoto: cardData?.profilePhoto || '',
  });

  // Handlers
  const handleValueChange = (e) => {
    setFormState((prev) => ({ ...prev, dealValue: e.target.value }));
  };
  const handleDealTitleChange = (e) => {
    setFormState((prev) => ({ ...prev, dealTitle: e.target.value }));
  };
  const handleDescriptionChange = (e) => {
    setFormState((prev) => ({ ...prev, dealDescription: e.target.value }));
  };
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, dealImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDone = async () => {
    console.log('[CardForm]: handleDone() called with formState:', formState);
    try {
      let expires_at = null;
      if (formState.expiresHours) {
        const now = new Date();
        now.setHours(now.getHours() + parseInt(formState.expiresHours, 10));
        expires_at = now.toISOString();
      }

      // Upsert the user row
      const phone = cardData?.phone;
      const userName = cardData?.name;
      const profilePhoto = cardData?.profilePhoto;

      if (!phone || !userName) {
        console.warn('[CardForm] No phone or userName in cardData. Possibly user skipped Onboarding?');
      }

      console.log('[CardForm] => Upserting user with phone:', phone, 'name:', userName);
      const user = await upsertUser({
        phone_number: phone,
        name: userName,
        profile_image_url: profilePhoto,
      });
      console.log('[CardForm] => upserted user =>', user);

      //  Create or update
      let dealResult;
      if (formState.id) {
        console.log('[CardForm]: Updating existing deal with ID:', formState.id);
        dealResult = await updateDeal({
          dealId: formState.id,
          title: formState.dealTitle,
          background: formState.dealImage,
          expires_at,
          creatorName: formState.name,
          deal_value: formState.dealValue,
        });
      } else {
        console.log('[CardForm]: Creating new deal (no existing ID).');
        dealResult = await createDeal({
          creator_id: user.id,
          title: formState.dealTitle,
          background: formState.dealImage,
          expires_at,
          creatorName: formState.name,
          deal_value: formState.dealValue,
        });
      }

      console.log('[CardForm]: Supabase returned dealResult:', dealResult);

      // Update global cardData
      setCardData((prev) => ({
        ...prev,
        ...formState,
        id: dealResult.id,
        share_link: dealResult.share_link,
        value: formState.dealValue,
      }));

      // Notify parent
      onSave?.({
        ...formState,
        id: dealResult.id,
      });

      console.log('[CardForm]: Deal creation/update succeeded. Calling onClose...');
      onClose?.();
    } catch (err) {
      console.error('[CardForm]: Error completing deal creation/update:', err);
      // optional: show a UI message
    }
  };

  // Live preview data
  const previewCardData = {
    value: formState.dealValue,
    title: formState.dealTitle,
    image: formState.dealImage,
    creatorName: formState.name,
    creatorPhoto: formState.profilePhoto,
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center"
      style={{
        backgroundColor: 'transparent',
        boxSizing: 'border-box',
        padding: '5%',
        overflow: 'visible',
      }}
    >
      <div className="flex flex-col w-full flex-grow items-start">
        <Card isInForm={true} cardData={previewCardData} />

        <div
          className="flex flex-col bg-white rounded-lg overflow-hidden px-[5%] box-border w-full max-w-lg mt-4"
          style={{ height: 'auto' }}
        >
          <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
            <Text type="large" role="primary" className="text-left">
              Create
            </Text>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-4 text-left">
            {/* Value */}
            <Text type="medium" role="tertiary">Value</Text>
            <div className="flex items-center">
              <span className="text-black mr-2 font-medium">$</span>
              <input
                type="text"
                placeholder="Dollars"
                value={formState.dealValue}
                onChange={handleValueChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none flex-1"
              />
            </div>

            {/* Title */}
            <Text type="medium" role="tertiary">Title</Text>
            <input
              type="text"
              placeholder="Add a title"
              value={formState.dealTitle}
              onChange={handleDealTitleChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none"
            />

            {/* Image */}
            <Text type="medium" role="tertiary">Image</Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-black focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mt-auto">
        <Button
          onClick={handleDone}
          type="secondary"
          className="w-full rounded-full font-semibold transition-all duration-150"
          style={{
            padding: 'clamp(1.25rem, 2.5%, 3rem)',
            fontSize: 'clamp(1.25rem, 2vw, 3rem)',
            textAlign: 'center',
          }}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}

export default CardForm;
