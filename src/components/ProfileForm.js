import React, { useEffect, useState } from 'react';
import Profile from './Profile';
import defaultProfile from '../assets/profile.svg';
import Text from '../config/Text';
import { textColors } from '../config/Colors';

function ProfileForm({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    profileImage: defaultProfile
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Implement your upload logic here
    // For now, we can just use a local URL as a placeholder:
    const newImageURL = URL.createObjectURL(file);
    handleChange('profileImage', newImageURL);
  };

  const handleDone = () => {
    // Validate and save logic here
    if (!formData.name.trim()) {
      alert("Please enter a name.");
      return;
    }
    // Optionally validate phoneNumber or format it
    // Save logic
    onSave(formData);
  };

  return (
    <div
      className="flex flex-col flex-1 bg-gray-50 rounded-lg overflow-hidden px-[5%] py-[5%] box-border"
      style={{
        height: '100%', // Stretch to full available height
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
        <Text type="large" role="primary">
          Step 1: Add Profile
        </Text>
        <button
          onClick={handleDone}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Done
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 space-y-3">
        {/* Name Input */}
        <div
          className="flex items-center py-4 px-5 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
        >
          {/* Optional: Show a generic profile icon or placeholder here */}
          <Profile
            src={defaultProfile}
            altText="Default icon"
            size={50}
          />
          <div className="flex-1 ml-4">
            <Text type="small" role="primary">
              Name
            </Text>
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-main"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
        </div>

        {/* Phone Number Input */}
        <div
          className="flex items-center py-4 px-5 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
        >
          {/* Optional: Use a phone icon image or default profile for consistency */}
          <Profile
            src={defaultProfile}
            altText="Phone icon placeholder"
            size={50}
          />
          <div className="flex-1 ml-4">
            <Text type="small" role="primary">
              Phone Number
            </Text>
            <input
              type="tel"
              className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-main"
              placeholder="(###) ###-####"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
            />
          </div>
        </div>

        {/* Profile Image Input */}
        <div
          className="flex items-center py-4 px-5 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
        >
          <Profile
            src={formData.profileImage || defaultProfile}
            altText="Profile image"
            size={50}
          />
          <div className="flex-1 ml-4 flex items-center space-x-2">
            <Text type="small" role="primary">
              Profile Image
            </Text>
            <label
              className="py-2 px-4 rounded-lg font-medium text-sm cursor-pointer bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition-colors inline-flex justify-center items-center"
            >
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileForm;
