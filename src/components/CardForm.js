// src/components/CardForm.jsx

import React, { useState } from "react";
import Card from "./Card";
import Text from "../config/Text";
import Button from "./Button";
import { createDeal, updateDeal } from "../services/dealsService";
import { useActivity } from "../contexts/ActivityContext";

/**
 * Props:
 *  - onClose: function() to close the overlay
 *  - onSave: function(formData) => called after successful create/update
 *  - initialData: { id, dealValue, dealTitle, dealImage, name, profilePhoto, localUserId }
 */
function CardForm({ onClose, onSave, initialData }) {
  const safeData = initialData ?? {};

  // State reflecting the form fields
  const [formState, setFormState] = useState({
    id: safeData.id ?? null,                   // deal ID if existing
    dealValue: safeData.dealValue ?? "",
    dealTitle: safeData.dealTitle ?? "",
    dealImage: safeData.dealImage ?? null,
    name: safeData.name ?? "",                // creator’s display name
    profilePhoto: safeData.profilePhoto ?? "",// creator’s photo
    localUserId: safeData.localUserId ?? null // the actual user’s ID
  });

  const { addActivity } = useActivity();

  // Handlers for each form field
  const handleValueChange = (e) => {
    setFormState((prev) => ({ ...prev, dealValue: e.target.value }));
  };
  const handleTitleChange = (e) => {
    setFormState((prev) => ({ ...prev, dealTitle: e.target.value }));
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

  // Called when user hits "Complete" in the form
  const handleDone = async () => {
    console.log("[CardForm] => handleDone with formState:", formState);

    try {
      const userId = formState.localUserId;
      if (!userId) {
        alert("No local user ID found. Cannot create or update deal.");
        return;
      }

      // Prepare payload for create/update
      const dealPayload = {
        creator_id: userId,
        title: formState.dealTitle,
        background: formState.dealImage,
        deal_value: formState.dealValue,
        creatorName: formState.name, // store the creator’s name in the DB row if you want
      };

      let dealResult;
      if (formState.id) {
        // We have an existing deal => update
        console.log("[CardForm] => updating existing deal with ID:", formState.id);
        dealResult = await updateDeal({
          dealId: formState.id,
          ...dealPayload
        });
        console.log("[CardForm] => updateDeal => returned =>", dealResult);

        // log "updated gift card"
        addActivity({
          userId,
          dealId: dealResult.id,
          action: "updated gift card"
        });
      } else {
        // brand-new deal => create
        console.log("[CardForm] => creating a new deal =>", dealPayload);
        dealResult = await createDeal(dealPayload);
        console.log("[CardForm] => createDeal => returned =>", dealResult);

        // log "created gift card"
        addActivity({
          userId,
          dealId: dealResult.id,
          action: "created gift card"
        });
      }

      // Pass the new/updated deal ID & data back
      onSave?.({
        ...formState,
        id: dealResult.id
      });
      onClose?.();
    } catch (err) {
      console.error("[CardForm]: Error =>", err);
      alert("Error creating/updating deal.");
    }
  };

  // For a visual preview in the form
  const previewCardData = {
    value: formState.dealValue,
    title: formState.dealTitle,
    image: formState.dealImage,
    name: formState.name,
    profilePhoto: formState.profilePhoto
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center p-[5%]"
      style={{
        backgroundColor: "transparent",
        boxSizing: "border-box",
        overflow: "visible"
      }}
    >
      <div className="flex flex-col w-full flex-grow items-start">
        {/* Card preview */}
        <Card isInForm={true} cardData={previewCardData} />

        <div
          className="flex flex-col bg-white rounded-lg overflow-hidden px-[5%] box-border w-full max-w-lg mt-4"
          style={{ height: "auto" }}
        >
          <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
            <Text type="large" role="primary" className="text-left">
              Create or Update
            </Text>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-4 text-left">
            <Text type="medium" role="tertiary">
              Value
            </Text>
            <div className="flex items-center">
              <span className="text-black mr-2 font-medium">$</span>
              <input
                type="text"
                placeholder="Dollars"
                value={formState.dealValue}
                onChange={handleValueChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none flex-1"
              />
            </div>

            <Text type="medium" role="tertiary">
              Title
            </Text>
            <input
              type="text"
              placeholder="Add a title"
              value={formState.dealTitle}
              onChange={handleTitleChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
            />

            <Text type="medium" role="tertiary">
              Image
            </Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-black focus:ring-1 focus:outline-none"
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
            padding: "1rem",
            fontSize: "1.25rem",
            textAlign: "center"
          }}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}

export default CardForm;
