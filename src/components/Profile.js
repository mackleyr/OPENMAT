// src/components/Profile.js

import React from 'react';
import profileDefault from '../assets/profile.svg';
import { useAuth } from '../contexts/AuthContext';
import { mainColor } from '../config/Colors';

function Profile({ src = '', onClick, size = '50%', score }) {
  const { profileData } = useAuth();

  const scoreBadgeSize = typeof size === 'string' ? parseInt(size) * 0.33 : size * 0.33;
  const fontSize = scoreBadgeSize * 0.5;

  return (
    <div
      onClick={onClick}
      className="relative inline-block cursor-pointer transition-opacity duration-150"
      style={{
        width: size,
        aspectRatio: '1 / 1',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Profile Image */}
      <div
        className="rounded-full overflow-hidden bg-white"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <img
          src={src || profileData?.profileImage || profileDefault}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default Profile;
