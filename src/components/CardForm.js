// src/components/CardForm.jsx
import React, { useState } from "react";
import Card from "./Card";
import Text from "../config/Text";
import Button from "./Button";
import { createDeal, updateDeal } from "../services/dealsService";
import { useActivity } from "../contexts/ActivityContext";

/**
 * cardData prop is an object containing:
 * {
 *   id, value, title, description, image, creatorId,
 *   userPayPalEmail, userName, userProfilePhoto
 * }
 */
function CardForm({ onClose, onSave, cardData }) {
  const [formState, setFormState] = useState({
    // Deal fields
    id: cardData?.id ?? null,
    dealValue: cardData?.value ?? "0",
    dealTitle: cardData?.title ?? "",
    dealDescription: cardData?.description ?? "",
    dealImage: cardData?.image ?? null,
    localUserId: cardData?.creatorId ?? null,

    // User fields
    userPayPalEmail: cardData?.userPayPalEmail ?? "",
    userName: cardData?.userName ?? "",
    userProfilePhoto: cardData?.userProfilePhoto ?? "",
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

  // On "Complete"
  const handleDone = async () => {
    try {
      // We rely on Home.jsx to do the actual upsert of user
      // so here we only create/update the deal 
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

      // Finally, call parent’s onSave => which will upsert user data + re-fetch
      onSave?.({
        ...formState,
        id: dealResult.id,
        share_link: dealResult.share_link,
      });
    } catch (err) {
      console.error("[CardForm] handleDone =>", err);
      alert("Error creating/updating deal.");
    }
  };

  // For the Card preview
  const previewCardData = {
    value: formState.dealValue,
    title: formState.dealTitle,
    image: formState.dealImage,
    description: formState.dealDescription,
    name: formState.userName,
    profilePhoto: formState.userProfilePhoto,
  };

  return (
    <div className="flex flex-col w-full h-full p-2 text-sm bg-white">
      {/* Card Preview */}
      <div
        className="flex-shrink-0 flex items-center justify-center mb-2"
        style={{ maxHeight: "40%" }}
      >
        <div className="w-full max-w-sm">
          <Card isInForm={true} cardData={previewCardData} />
        </div>
      </div>

      {/* Deal + User Fields */}
      <div className="flex flex-col flex-grow w-full max-w-sm mx-auto overflow-hidden">
        <div className="bg-white w-full space-y-4">
          <div className="border-b pb-2">
            <Text type="medium" role="primary" className="text-left text-base">
              {formState.id ? "Update Deal" : "Create Deal"}
            </Text>
          </div>

          {/* Deal Inputs */}
          <div className="grid grid-cols-[auto_1fr] gap-y-2 gap-x-3 text-left items-center">
            <Text type="small" role="tertiary" className="text-sm">
              Value
            </Text>
            <div className="flex items-center">
              <span className="mr-2 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formState.dealValue}
                onChange={handleValueChange}
                className="border border-gray-300 rounded-md px-1 py-0.5 text-black"
              />
            </div>

            <Text type="small" role="tertiary" className="text-sm">
              Title
            </Text>
            <input
              type="text"
              placeholder="Add a title"
              value={formState.dealTitle}
              onChange={handleTitleChange}
              className="border border-gray-300 rounded-md px-1 py-0.5 text-black"
            />

            <Text type="small" role="tertiary" className="text-sm">
              Image
            </Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-black"
            />
          </div>

          {/* User Inputs */}
          <div className="mt-3 border-t pt-3">
            <Text type="medium" role="primary" className="text-base mb-2">
              Your Info
            </Text>
            <div className="grid grid-cols-[auto_1fr] gap-y-2 gap-x-3 items-center">
              <Text type="small" role="tertiary" className="text-sm">
                PayPal Email
              </Text>
              <input
                type="email"
                placeholder="you@example.com"
                value={formState.userPayPalEmail}
                onChange={handleUserPayPalChange}
                className="border border-gray-300 rounded-md px-1 py-0.5 text-black"
              />

              <Text type="small" role="tertiary" className="text-sm">
                Name
              </Text>
              <input
                type="text"
                placeholder="Your Name"
                value={formState.userName}
                onChange={handleUserNameChange}
                className="border border-gray-300 rounded-md px-1 py-0.5 text-black"
              />

              <Text type="small" role="tertiary" className="text-sm">
                Profile
              </Text>
              <input
                type="file"
                accept="image/*"
                onChange={handleUserProfilePhotoChange}
                className="text-black"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button(s) */}
      <div className="flex-shrink-0 w-full max-w-sm mx-auto mt-2">
        <Button
          onClick={handleDone}
          type="secondary"
          className="w-full rounded-full font-semibold"
          style={{ padding: "0.75rem", fontSize: "1rem", textAlign: "center" }}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}

export default CardForm;
