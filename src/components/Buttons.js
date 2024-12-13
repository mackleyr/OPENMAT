// src/components/Buttons.js

import React, { useState } from 'react';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import { useCoupon } from '../contexts/CouponContext';

function Buttons() {
  const { profileData, setProfileData, updateUserProfile } = useAuth();
  const { couponData } = useCoupon();
  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);
  const [actionsTaken, setActionsTaken] = useState({
    copied: false,
    shared: false,
  });

  // Handle Copy Button Logic
  const handleCopyClick = async () => {
    // Copy the link logic (implement as needed)
    // ...

    if (!actionsTaken.copied) {
      // Increment score
      const newScore = profileData.score + 1;
      setProfileData((prev) => ({ ...prev, score: newScore }));
      await updateUserProfile({ score: newScore });
      setActionsTaken((prev) => ({ ...prev, copied: true }));
    }

    setIsCopyClicked(true);
    setTimeout(() => setIsCopyClicked(false), 5000); // Reset after 5 seconds
  };

  // Handle Share Button Logic
  const handleShareClick = async () => {
    // Share deal logic (implement as needed)
    // ...

    if (!actionsTaken.shared) {
      // Increment score
      const newScore = profileData.score + 1;
      setProfileData((prev) => ({ ...prev, score: newScore }));
      await updateUserProfile({ score: newScore });
      setActionsTaken((prev) => ({ ...prev, shared: true }));
    }

    setIsShareClicked(true);
    setTimeout(() => setIsShareClicked(false), 5000); // Reset after 5 seconds
  };

  return (
    <div
      className="grid grid-cols-2 gap-[5%] px-[5%] w-full"
      style={{
        boxSizing: 'border-box',
      }}
    >
      <Button
        label={isCopyClicked ? 'Copied!' : '2. Copy Link'}
        type="secondary"
        onClick={handleCopyClick}
      />
      <Button
        label={isShareClicked ? 'Shared!' : '3. Share Deal'}
        type="secondary"
        onClick={handleShareClick}
      />
    </div>
  );
}

export default Buttons;
