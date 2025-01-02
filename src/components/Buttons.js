// src/components/Buttons.jsx
import React, { useState } from "react";
import { useCard } from "../contexts/CardContext";
import Button from "./Button";
import { useActivity } from "../contexts/ActivityContext";

/**
 * We assume:
 *  - onShare => function that does "copy link" logic
 *  - onClaim => function that triggers claim logic
 */
function Buttons({ onShare, onClaim }) {
  const [isLeftClicked, setIsLeftClicked] = useState(false);
  const [isRightClicked, setIsRightClicked] = useState(false);

  const { cardData } = useCard();
  const { addActivity } = useActivity();

  // Left button => "Copy Link"
  const handleCopyClick = async () => {
    if (!onShare) return;
    try {
      await onShare();
      setIsLeftClicked(true);
      setTimeout(() => setIsLeftClicked(false), 3000);
    } catch (err) {
      console.error("[Buttons] handleCopyClick =>", err);
    }
  };

  // Right button => "Claim"
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
