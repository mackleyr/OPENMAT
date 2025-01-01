// src/components/Buttons.jsx

import React, { useState } from 'react';
import Button from './Button';
import { useCard } from '../contexts/CardContext';

/**
 * mode='share' => "Copy Link" + "Share"
 * mode='claim' => "Claim" + "Share"
 *
 * NEW: onShare => Optional parent function to run DB logic (e.g. upsert 'shares', addActivity, etc.)
 */
function Buttons({ mode = 'share', onClaim, onShare }) {
  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);

  // Pull in the share_link from cardData
  const { cardData } = useCard();

  // Handle Copy/Claim Button
  const handlePrimaryClick = async () => {
    if (mode === 'share') {
      // "Copy Link" logic
      if (!cardData?.share_link) {
        console.log("No share link to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(cardData.share_link);
        setIsCopyClicked(true);
        setTimeout(() => setIsCopyClicked(false), 5000);
        console.log("Link copied:", cardData.share_link);
      } catch (error) {
        console.error("Failed to copy link:", error);
      }
    } else if (mode === 'claim') {
      // "Claim" logic
      if (onClaim) {
        onClaim(); // let ClaimCard handle it (show onboarding, etc.)
      } else {
        console.log("User wants to claim this deal. [TODO: Implement claim logic]");
      }
      setIsCopyClicked(true);
      setTimeout(() => setIsCopyClicked(false), 5000);
    }
  };

  // Handle Share Button
  const handleShareClick = async () => {
    // 1) Call parent's onShare (e.g., to insert into DB + addActivity)
    if (onShare) {
      try {
        await onShare();
      } catch (err) {
        console.error("[Buttons] onShare error:", err);
      }
    }

    // 2) Then proceed with the Web Share API fallback
    if (!cardData?.share_link) {
      console.log("No share link to share.");
      return;
    }

    // If Web Share API is available, try using it
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my Deal!',
          text: 'View this gift card or deal.',
          url: cardData.share_link,
        });
        setIsShareClicked(true);
        setTimeout(() => setIsShareClicked(false), 5000);
        console.log("Deal link shared via Web Share API:", cardData.share_link);
      } catch (err) {
        console.log("Sharing failed:", err.message);
      }
    } else {
      // Fallback: copy to clipboard, or show a prompt
      try {
        await navigator.clipboard.writeText(cardData.share_link);
        console.log("Link copied to clipboard (fallback).");
        setIsShareClicked(true);
        setTimeout(() => setIsShareClicked(false), 5000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  // Decide button labels based on mode
  const primaryLabel =
    mode === 'share'
      ? isCopyClicked ? 'Copied!' : 'Copy Link'
      : isCopyClicked ? 'Claimed!' : 'Claim';

  const secondaryLabel = isShareClicked ? 'Shared!' : 'Share';

  return (
    <div
      className="grid grid-cols-2 gap-[5%] px-[5%] py-[5%] w-full"
      style={{ boxSizing: 'border-box' }}
    >
      <Button
        label={primaryLabel}
        type="secondary"
        onClick={handlePrimaryClick}
      />
      <Button
        label={secondaryLabel}
        type="secondary"
        onClick={handleShareClick}
      />
    </div>
  );
}

export default Buttons;
