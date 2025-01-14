// src/components/CardForm.jsx
import React, { useState } from "react";
import Card from "./Card";
import Text from "../config/Text";
import Button from "./Button";
import { createDeal, updateDeal } from "../services/dealsService";
import { useActivity } from "../contexts/ActivityContext";

function CardForm({ onClose, onSave, cardData }) {
  const [formState, setFormState] = useState({
    // Deal fields
    id: cardData.id ?? null,
    dealValue: cardData.value ?? "",
    dealTitle: cardData.title ?? "",
    dealDescription: cardData.description ?? "",
    dealImage: cardData.image ?? null,
    // User fields
    userPayPalEmail: cardData.userPayPalEmail ?? "",
    userName: cardData.userName ?? "",
    userProfilePhoto: cardData.userProfilePhoto ?? "",
    localUserId: cardData.creatorId ?? null,
  });

  const { addActivity } = useActivity();

  // Deal field handlers
  const handleValueChange = (e) =>
    setFormState((prev) => ({ ...prev, dealValue: e.target.value }));
  const handleTitleChange = (e) =>
    setFormState((prev) => ({ ...prev, dealTitle: e.target.value }));
  const handleDescriptionChange = (e) =>
    setFormState((prev) => ({ ...prev, dealDescription: e.target.value }));
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, dealImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // User field handlers
  const handleUserPayPalChange = (e) =>
    setFormState((prev) => ({ ...prev, userPayPalEmail: e.target.value }));
  const handleUserNameChange = (e) =>
    setFormState((prev) => ({ ...prev, userName: e.target.value }));
  const handleUserProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, userProfilePhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDone = async () => {
    // 1) If we have a localUserId => create/update the deal
    try {
      if (!formState.localUserId) {
        alert("No local user ID found. Cannot create or update deal.");
        return;
      }
      const dealPayload = {
        creator_id: formState.localUserId,
        title: formState.dealTitle,
        background: formState.dealImage,
        deal_value: parseFloat(formState.dealValue) || 0,
        description: formState.dealDescription,
      };

      let dealResult;
      if (formState.id) {
        // update existing
        dealResult = await updateDeal({
          dealId: formState.id,
          title: dealPayload.title,
          background: dealPayload.background,
          deal_value: dealPayload.deal_value,
          description: dealPayload.description,
        });
        await addActivity({
          userId: formState.localUserId,
          dealId: dealResult.id,
          action: "updated gift card",
        });
      } else {
        // create new
        dealResult = await createDeal(dealPayload);
        await addActivity({
          userId: formState.localUserId,
          dealId: dealResult.id,
          action: "created gift card",
        });
      }

      // 2) Send back the entire formState so Home can upsert user & finalize
      onSave?.({
        ...formState,
        id: dealResult.id,
        share_link: dealResult.share_link,
      });
    } catch (err) {
      console.error("[CardForm]: Error =>", err);
      alert("Error creating/updating deal.");
    }
  };

  // For live preview => note that user fields won't directly impact the Card preview unless you want them displayed.
  const previewCardData = {
    value: formState.dealValue,
    title: formState.dealTitle,
    image: formState.dealImage,
    name: formState.userName,
    profilePhoto: formState.userProfilePhoto,
    description: formState.dealDescription,
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center p-4">
      {/* Preview */}
      <div className="flex flex-col w-full flex-grow items-start">
        <Card isInForm={true} cardData={previewCardData} />

        <div className="flex flex-col bg-white rounded-lg overflow-hidden px-4 w-full max-w-lg mt-4">
          <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
            <Text type="large" role="primary" className="text-left">
              {formState.id ? "Update Deal" : "Create Deal"}
            </Text>
          </div>

          {/* Deal Inputs */}
          <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-4 text-left">
            <Text type="medium" role="tertiary">Value</Text>
            <div className="flex items-center">
              <span className="text-black mr-2 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="Dollars"
                value={formState.dealValue}
                onChange={handleValueChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none flex-1"
              />
            </div>

            <Text type="medium" role="tertiary">Title</Text>
            <input
              type="text"
              placeholder="Add a title"
              value={formState.dealTitle}
              onChange={handleTitleChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
            />

            <Text type="medium" role="tertiary">Description</Text>
            <input
              type="text"
              placeholder="Describe your gift card"
              value={formState.dealDescription}
              onChange={handleDescriptionChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
            />

            <Text type="medium" role="tertiary">Image</Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-black focus:ring-1 focus:outline-none"
            />
          </div>

          {/* User Inputs (PayPal, Name, Profile Photo) */}
          <div className="mt-6 border-t border-gray-300 pt-4">
            <Text type="large" role="primary">Your Info</Text>
            <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-4 mt-2">
              {/* PayPal Email */}
              <Text type="medium" role="tertiary">PayPal Email</Text>
              <input
                type="email"
                placeholder="you@example.com"
                value={formState.userPayPalEmail}
                onChange={handleUserPayPalChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
              />

              {/* Name */}
              <Text type="medium" role="tertiary">Name</Text>
              <input
                type="text"
                placeholder="Your Name"
                value={formState.userName}
                onChange={handleUserNameChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
              />

              {/* Profile Photo */}
              <Text type="medium" role="tertiary">Profile Photo</Text>
              <input
                type="file"
                accept="image/*"
                onChange={handleUserProfilePhotoChange}
                className="text-black focus:ring-1 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* "Complete" button */}
      <div className="w-full max-w-md mt-auto">
        <Button
          onClick={handleDone}
          type="secondary"
          className="w-full rounded-full font-semibold transition-all"
          style={{ padding: "1rem", fontSize: "1.25rem", textAlign: "center" }}
        >
          Complete
        </Button>

        <Button
          onClick={onClose}
          type="tertiary"
          className="w-full rounded-full font-semibold transition-all mt-2"
          style={{ padding: "1rem", fontSize: "1.25rem", textAlign: "center" }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default CardForm;
