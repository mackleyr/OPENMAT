import React, { useState } from "react";
import Card from "./Card";
import Text from "../config/Text";
import Button from "./Button";
import { createDeal, updateDeal } from "../services/dealsService";
import { useActivity } from "../contexts/ActivityContext";

function CardForm({ onClose, onSave, cardData }) {
  const [formState, setFormState] = useState({
    id: cardData.id ?? null,
    dealValue: cardData.value ?? "",
    dealTitle: cardData.title ?? "",
    dealDescription: cardData.description ?? "",
    dealImage: cardData.image ?? null,
    name: cardData.name ?? "",
    profilePhoto: cardData.profilePhoto ?? "",
    localUserId: cardData.creatorId ?? null,
  });

  const { addActivity } = useActivity();

  // Handlers for each input
  const handleValueChange = (e) => {
    setFormState((prev) => ({ ...prev, dealValue: e.target.value }));
  };
  const handleTitleChange = (e) => {
    setFormState((prev) => ({ ...prev, dealTitle: e.target.value }));
  };
  const handleDescriptionChange = (e) => {
    setFormState((prev) => ({ ...prev, dealDescription: e.target.value }));
  };

  // Handle file upload => convert to Data URL => store in dealImage
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, dealImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Called when user hits "Complete"
  const handleDone = async () => {
    console.log("[CardForm] => handleDone with formState:", formState);

    try {
      const userId = formState.localUserId;
      if (!userId) {
        alert("No local user ID found. Cannot create or update deal.");
        return;
      }

      // Prepare the payload for createDeal / updateDeal
      const dealPayload = {
        creator_id: userId,
        title: formState.dealTitle,
        background: formState.dealImage,
        deal_value: formState.dealValue,
        creatorName: formState.name,
        description: formState.dealDescription,
        // Important: do NOT forcibly generate a new link here
        // regenLink: true, // only if you REALLY want a new link
      };

      let dealResult;
      if (formState.id) {
        // We have an existing deal => update
        console.log("[CardForm] => updating existing deal with ID:", formState.id);
        dealResult = await updateDeal({
          dealId: formState.id,
          ...dealPayload,
        });
        console.log("[CardForm] => updateDeal => returned =>", dealResult);

        addActivity({
          userId,
          dealId: dealResult.id,
          action: "updated gift card",
        });
      } else {
        // brand-new => create
        console.log("[CardForm] => creating a new deal =>", dealPayload);
        dealResult = await createDeal(dealPayload);
        console.log("[CardForm] => createDeal => returned =>", dealResult);

        addActivity({
          userId,
          dealId: dealResult.id,
          action: "created gift card",
        });
      }

      // Pass the updated data back to TheRealDeal => handleSaveCard
      onSave?.({
        ...formState,
        id: dealResult.id,
        share_link: dealResult.share_link,
      });
      onClose?.();
    } catch (err) {
      console.error("[CardForm]: Error =>", err);
      alert("Error creating/updating deal.");
    }
  };

  // For the live preview in the form
  const previewCardData = {
    value: formState.dealValue,
    title: formState.dealTitle,
    image: formState.dealImage,
    name: formState.name,
    profilePhoto: formState.profilePhoto,
  };
  
  console.log("[CardForm] previewCardData:", previewCardData);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center p-[5%]"
      style={{
        backgroundColor: "transparent",
        boxSizing: "border-box",
        overflow: "visible",
      }}
    >
      {/* This top section is the "card preview" */}
      <div className="flex flex-col w-full flex-grow items-start">
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
            {/* Deal Value */}
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

            {/* Deal Title */}
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

            {/* Deal Description */}
            <Text type="medium" role="tertiary">
              Description
            </Text>
            <textarea
              rows={2}
              placeholder="Optional description"
              value={formState.dealDescription}
              onChange={handleDescriptionChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:outline-none"
            />

            {/* Deal Image */}
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

      {/* The "Complete" button at the bottom */}
      <div className="w-full max-w-md mt-auto">
        <Button
          onClick={handleDone}
          type="secondary"
          className="w-full rounded-full font-semibold transition-all duration-150"
          style={{
            padding: "clamp(1.25rem, 2.5%, 3rem)",
            fontSize: "clamp(1.25rem, 2vw, 3rem)",
            textAlign: "center",
          }}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}

export default CardForm;
