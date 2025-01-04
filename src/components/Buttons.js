// src/components/Buttons.jsx
import React, { useState } from "react";
import { useCard } from "../contexts/CardContext";
import Button from "./Button";
import { useActivity } from "../contexts/ActivityContext";

/**
 * We unify the "shared gift card" logging inside handleCopyClick,
 * so that if the user actually copies the link, we log it once.
 */
function Buttons({ onClaim }) {
  const [isLeftClicked, setIsLeftClicked] = useState(false);
  const [isRightClicked, setIsRightClicked] = useState(false);

  const { cardData } = useCard();
  const { addActivity } = useActivity();

  // Left button => "Copy Link"
  const handleCopyClick = async () => {
    // Only log if we have a real user and deal
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

      // Now log "shared gift card" once
      await addActivity({
        userId: cardData.creatorId, // The user who created it
        action: "shared gift card",
        dealId: cardData.id,
      });

      setIsLeftClicked(true);
      setTimeout(() => setIsLeftClicked(false), 3000);
    } catch (err) {
      console.error("[Buttons] handleCopyClick =>", err);
    }
  };

  // Right button => "Claim"
  // This calls the parent's onClaim
  const handleClaimClick = async () => {
    if (!onClaim) return;
    try {
      await onClaim();
      setIsRightClicked(true);
      setTimeout(() => setIsRightClicked(false), 3000);
    } catch (err) {
      console.error("[Buttons] handleClaimClick =>", err);
    }
  };

  return (
    <div
      className="grid grid-cols-2 gap-[5%] px-[5%] py-[5%] w-full"
      style={{ boxSizing: "border-box" }}
    >
      {/* Left => Copy Link */}
      <Button
        label={isLeftClicked ? "Copied!" : "Copy Link"}
        type="secondary"
        onClick={handleCopyClick}
      />
      {/* Right => Claim */}
      <Button
        label={isRightClicked ? "Claimed!" : "Claim"}
        type="secondary"
        onClick={handleClaimClick}
      />
    </div>
  );
}

export default Buttons;
