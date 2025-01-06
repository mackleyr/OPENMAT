import React, { useState } from "react";
import { useCard } from "../contexts/CardContext";
import Button from "./Button";
import { useActivity } from "../contexts/ActivityContext";

function Buttons({ onSave }) {
  const [isLeftClicked, setIsLeftClicked] = useState(false);
  const [isRightClicked, setIsRightClicked] = useState(false);

  const { cardData } = useCard();
  const { addActivity } = useActivity();

  // Left button => "Copy Link"
  const handleCopyClick = async () => {
    if (!cardData.id || !cardData.creatorId) {
      alert("No valid deal or user to share.");
      return;
    }
    try {
      // Build link with sharer param
      const userName = cardData.name || "anon";
      const linkWithSharer = `${cardData.share_link}?sharer=${encodeURIComponent(
        userName
      )}`;
      await navigator.clipboard.writeText(linkWithSharer);
      alert("Link copied: " + linkWithSharer);

      // Log "shared gift card"
      await addActivity({
        userId: cardData.creatorId,
        action: "shared gift card",
        dealId: cardData.id,
      });

      setIsLeftClicked(true);
      setTimeout(() => setIsLeftClicked(false), 3000);
    } catch (err) {
      console.error("[Buttons] handleCopyClick =>", err);
    }
  };

  // Right button => "Save"
  const handleSaveClick = async () => {
    if (!onSave) return;
    try {
      await onSave();
      setIsRightClicked(true);
      setTimeout(() => setIsRightClicked(false), 3000);
    } catch (err) {
      console.error("[Buttons] handleSaveClick =>", err);
    }
  };

  return (
    <div
      className="grid grid-cols-2 gap-[5%] px-[5%] py-[5%] w-full"
      style={{ boxSizing: "border-box" }}
    >
      {/* Left => Share Link */}
      <Button
        label={isLeftClicked ? "Copied!" : "Copy Link"}
        type="secondary"
        onClick={handleCopyClick}
      />

      {/* Right => Save */}
      <Button
        label={isRightClicked ? "Claimed!" : "Claim"}
        type="secondary"
        onClick={handleSaveClick}
      />
    </div>
  );
}

export default Buttons;
