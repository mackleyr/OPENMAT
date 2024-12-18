import React, { useState } from 'react';
import Button from './Button';

function Buttons() {
  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);

  // Handle Copy Button Logic
  const handleCopyClick = async () => {
    // Implement copy logic as needed
    // For now, just simulate success
    setIsCopyClicked(true);
    setTimeout(() => setIsCopyClicked(false), 5000);
  };

  // Handle Share Button Logic
  const handleShareClick = async () => {
    // Implement share logic as needed
    setIsShareClicked(true);
    setTimeout(() => setIsShareClicked(false), 5000);
  };

  return (
    <div
      className="grid grid-cols-2 gap-[5%] px-[5%] w-full"
      style={{
        boxSizing: 'border-box',
      }}
    >
      <Button
        label={isCopyClicked ? 'Claimed!' : 'Claim'}
        type="secondary"
        onClick={handleCopyClick}
      />
      <Button
        label={isShareClicked ? 'Shared!' : 'Share'}
        type="secondary"
        onClick={handleShareClick}
      />
    </div>
  );
}

export default Buttons;
