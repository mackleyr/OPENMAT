// src/components/Header.js

// (i) Share, (ii) Deals

import React, { useContext } from 'react';
import { colorScheme, mainColor } from '../config/Colors';
import Text from '../config/Text';
import { ReactComponent as Logo2 } from '../assets/logo-2.svg';
import Profile from './Profile';
import { AuthContext } from '../contexts/AuthContext';
import defaultProfile from '../assets/profile.svg';

function Header({ onProfileClick }) {
  const { profileData } = useContext(AuthContext);

  return (
    <div
      className="w-full flex-shrink-0 bg-white border-b"
      style={{
        height: '10%',
        padding: '5%',
        boxSizing: 'border-box',
      }}
    >
      <div className="grid grid-cols-4 gap-4 items-center h-full">
        {/* Logo */}
        <div className="flex justify-center items-center w-full h-full px-4">
          <Logo2
            className="w-full h-full"
            style={{
              color: colorScheme.inactive.background,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = colorScheme.active.background)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = colorScheme.inactive.background)
            }
          />
        </div>

        {/* Share Link */}
        <div className="flex justify-center items-center w-full h-full">
          <a
            href="https://and.deals"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <Text
              type="large"
              role="tertiary"
              isClickable
              className="hover:underline hover:bold text-center"
            >
              Share
            </Text>
          </a>
        </div>

        {/* Deals Button */}
        <div className="flex justify-center items-center w-full h-full">
          <button className="flex items-center justify-center">
            <Text
              type="large"
              role="tertiary"
              isClickable
              className="hover:underline hover:bold text-center"
            >
              Deals
            </Text>
          </button>
        </div>

        {/* Profile Image */}
        <div className="flex justify-center items-center w-full h-full">
          <Profile
            src={profileData?.profileImage || defaultProfile}
            className="rounded-full object-cover"
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            onClick={onProfileClick}
          />
        </div>
      </div>
    </div>
  );
}

export default Header;
