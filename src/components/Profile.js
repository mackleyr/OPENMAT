import React from 'react';
import profileDefault from '../assets/profile.svg';

function Profile({ src = '', onClick, size = '50%', score }) {
  // We no longer fetch from useAuth or profileData.
  // Just display the provided src or a default image.
  
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
          src={src || profileDefault}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default Profile;
