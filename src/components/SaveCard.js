// src/components/SaveCard.jsx

import React from 'react';
import Text from '../config/Text';
import Button from './Button';

// Parker sees this after Onboarding. 
function SaveCard({ onClose, dealData }) {
  // “Save to Wallet” logic
  const handleSaveWallet = () => {
    console.log('Attempt to save to Apple Wallet or pass through PassKit');
    // TODO: Real integration with Apple Wallet or PassKit
    onClose?.();
  };

  // “Download” logic
  const handleDownload = () => {
    console.log('User wants to download this deal as an image/PDF, etc.');
    // TODO: Real implementation
    onClose?.();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <Text type="large" role="primary" className="text-center mb-4">
          Save Your Deal
        </Text>

        {/* You could show a preview of the card again or some instructions */}
        <div className="flex flex-col space-y-4 mt-4">
          <Button type="secondary" onClick={handleSaveWallet}>
            Save to Wallet
          </Button>
          <Button type="secondary" onClick={handleDownload}>
            Download
          </Button>
          <Button
            type="secondary"
            onClick={() => onClose?.()}
            style={{ backgroundColor: 'gray', marginTop: '1rem' }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SaveCard;
