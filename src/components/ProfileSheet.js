import React, { useEffect, useState } from 'react';
import Profile from './Profile';
import Text from '../config/Text';
import { colorScheme } from '../config/Colors';

function ProfileSheet({ onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);

  // Just local states for name and image
  const [name, setName] = useState('Anonymous');
  const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleEditToggle = () => {
    // Normally, you'd update user profile here, but we've removed all user logic.
    setIsEditing(!isEditing);
  };

  const handleShareProfile = () => {
    if (!isEditing) {
      // Simulate share logic or remove if unnecessary.
      setIsShareClicked(true);
      setTimeout(() => setIsShareClicked(false), 5000);
      alert('Profile shared (simulated).');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Blurred Background */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: isVisible ? colorScheme.glass.blur : 'none',
          WebkitBackdropFilter: isVisible ? colorScheme.glass.blur : 'none',
        }}
        onClick={handleClose}
      ></div>

      {/* ProfileSheet */}
      <div
        className={`absolute inset-x-0 bottom-0 rounded-t-lg p-4 md:p-6 z-50 overflow-y-auto transform transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          backgroundColor: colorScheme.glass.background,
          boxShadow: colorScheme.glass.shadow,
        }}
      >
        <button
          onClick={handleClose}
          className="text-white absolute top-4 right-4 text-xl md:text-2xl"
        >
          ✕
        </button>

        <div className="flex flex-col items-center space-y-6 md:space-y-8 py-4">
          <div className="relative">
            {/* Profile Image */}
            <label className="cursor-pointer">
              <Profile
                size={window.innerWidth > 768 ? 140 : 120}
                src={profileImage}
              />
              {isEditing && (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              )}
            </label>
          </div>

          {/* Name Input */}
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xl md:text-2xl font-semibold text-center bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-mainColor"
            />
          ) : (
            <Text type="large" role="white" className="text-center">
              {name}
            </Text>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={handleShareProfile}
              className="py-2 px-4 rounded-lg bg-gray-600 text-white text-lg md:text-xl w-full"
            >
              {isShareClicked ? 'Shared!' : 'Share Profile'}
            </button>

            <button
              onClick={handleEditToggle}
              className="py-2 px-4 rounded-lg bg-gray-600 text-white text-lg md:text-xl w-full"
            >
              {isEditing ? 'Save' : 'Edit Profile'}
            </button>
          </div>
          
          {/* Remove Delete Account logic since no auth is present */}
        </div>
      </div>
    </>
  );
}

export default ProfileSheet;
