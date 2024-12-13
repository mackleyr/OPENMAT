import React, { useEffect, useState, useContext } from 'react';
import Profile from './Profile';
import Text from '../config/Text';
import { colorScheme } from '../config/Colors';
import { AuthContext } from '../contexts/AuthContext';
import editIcon from '../assets/edit.svg';
import shareIcon from '../assets/share.svg';
import checkIcon from '../assets/check.svg';
import Button from './Button';

function ProfileSheet({ onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);
  const { profileData, updateUserProfile, refreshProfile, deleteUser } = useContext(AuthContext);

  // Local state for editing
  const [name, setName] = useState(profileData?.name || '');
  const [profileImage, setProfileImage] = useState(profileData?.profileImage || '');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = async () => {
    setIsVisible(false);
    setTimeout(async () => {
      await refreshProfile(); // Ensure latest profile data is fetched
      onClose();
    }, 300);
  };

  const handleEditToggle = async () => {
    if (isEditing) {
      // Save profile changes (no bio or score anymore)
      await updateUserProfile({ name, profile_image_url: profileImage });
    }
    setIsEditing(!isEditing); // Toggle editing mode
  };

  const handleShareProfile = () => {
    if (!isEditing) {
      if (navigator.share) {
        setIsShareClicked(true);
        setTimeout(() => setIsShareClicked(false), 5000);
        navigator
          .share({
            title: 'See my deals!',
            text: `${name}'s profile on Friends & Family.`,
            url: `https://and.deals/${name}/[uniqueid]`, // Example share URL
          })
          .catch((error) => console.error('Error sharing profile:', error));
      } else {
        alert('Sharing not supported on this browser.');
      }
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
            {/* Share Profile Button */}
            <Button
              label={isShareClicked ? 'Shared!' : 'Share Profile'}
              type="secondary"
              onClick={handleShareProfile}
              className="text-lg md:text-xl w-full"
            />

            {/* Edit Profile Button */}
            <Button
              label={isEditing ? 'Save' : 'Edit Profile'}
              type="secondary"
              onClick={handleEditToggle}
              className="text-lg md:text-xl w-full"
            />
          </div>
          
          <p
            onClick={async () => {
              if (window.confirm("Are you sure? All of your deals will disappear. This action cannot be undone.")) {
                try {
                  await deleteUser();
                  onClose();
                } catch (error) {
                  console.error("Error deleting user:", error.message);
                }
              }
            }}
            className="text-md text-primary hover:text-gray-300 cursor-pointer mt-4 text-center"
          >
            Delete Account
          </p>
        </div>
      </div>
    </>
  );
}

export default ProfileSheet;
