// src/components/CardForm.jsx
import React, { useState } from "react";
import Card from "./Card";
import Text from "../config/Text";
import Button from "./Button";
import { createDeal, updateDeal } from "../services/dealsService";
import { useActivity } from "../contexts/ActivityContext";

function CardForm({ onClose, onSave, cardData }) {
  const [formState, setFormState] = useState({
    id: cardData.id ?? null,
    dealValue: cardData.value ?? "",        // numeric stored as string in state
    dealTitle: cardData.title ?? "",
    dealDescription: cardData.description ?? "",
    dealImage: cardData.image ?? null,      // base64 or URL
    name: cardData.name ?? "",
    profilePhoto: cardData.profilePhoto ?? "",
    localUserId: cardData.creatorId ?? null,
  });

  const { addActivity } = useActivity();

  console.log("[CardForm] => initial formState:", formState);

  // Input Handlers
  const handleValueChange = (e) => {
    setFormState((prev) => ({ ...prev, dealValue: e.target.value }));
  };
  const handleTitleChange = (e) => {
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

  // "Complete" button
  const handleDone = async () => {
    console.log("[CardForm] => handleDone with formState:", formState);

    try {
      if (!formState.localUserId) {
        alert("No local user ID found. Cannot create or update deal.");
        return;
      }
      // Prepare payload for createDeal / updateDeal
      const dealPayload = {
        creator_id: formState.localUserId,
        title: formState.dealTitle,
        background: formState.dealImage,               // pass base64 or URL
        deal_value: parseFloat(formState.dealValue) || 0,
        creatorName: formState.name,                   // for share link
        description: formState.dealDescription,
      };

      let dealResult;
      if (formState.id) {
        // Existing deal => update
        console.log("[CardForm] => calling updateDeal =>", dealPayload);
        dealResult = await updateDeal({
          dealId: formState.id,
          title: dealPayload.title,
          background: dealPayload.background,
          deal_value: dealPayload.deal_value,
          description: dealPayload.description,
        });
        console.log("[CardForm] => updateDeal => returned =>", dealResult);

        addActivity({
          userId: formState.localUserId,
          dealId: dealResult.id,
          action: "updated gift card",
        });
      } else {
        // brand-new => create
        console.log("[CardForm] => calling createDeal =>", dealPayload);
        dealResult = await createDeal(dealPayload);
        console.log("[CardForm] => createDeal => returned =>", dealResult);

        addActivity({
          userId: formState.localUserId,
          dealId: dealResult.id,
          action: "created gift card",
        });
      }

      // Pass updated data back to TheRealDeal => handleSaveCard
      onSave?.({
        ...formState,
        dealValue: dealPayload.deal_value.toString(), // keep string version in local form
        id: dealResult.id,
        share_link: dealResult.share_link,
      });
      onClose?.();
    } catch (err) {
      console.error("[CardForm]: Error =>", err);
      alert("Error creating/updating deal.");
    }
  };

  // For the live preview
  const previewCardData = {
    value: formState.dealValue,
    title: formState.dealTitle,
    image: formState.dealImage,
    name: formState.name,
    profilePhoto: formState.profilePhoto,
  };
  console.log("[CardForm] => previewCardData:", previewCardData);

  return (
    <div className="relative w-full h-full flex flex-col items-center p-4">
      {/* Card Preview */}
      <div className="flex flex-col w-full flex-grow items-start">
        <Card isInForm={true} cardData={previewCardData} />

        <div className="flex flex-col bg-white rounded-lg overflow-hidden px-4 w-full max-w-lg mt-4">
          <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
            <Text type="large" role="primary" className="text-left">
              Create or Update
            </Text>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-4 text-left">
            {/* Deal Value */}
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

            {/* Deal Title */}
            <Text type="medium" role="tertiary">Title</Text>
            <input
              type="text"
              placeholder="Add a title"
              value={formState.dealTitle}
              onChange={handleTitleChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
            />

            {/* Deal Description */}
            <Text type="medium" role="tertiary">Description</Text>
            <textarea
              rows={2}
              placeholder="Optional description"
              value={formState.dealDescription}
              onChange={handleDescriptionChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
            />

            {/* Deal Image */}
            <Text type="medium" role="tertiary">Image</Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-black focus:ring-1 focus:outline-none"
            />
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
      </div>
    </div>
  );
}

export default CardForm;
