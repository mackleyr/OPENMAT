// src/components/Footer.js

import React from 'react';
import { mainColor } from '../config/Colors';
import Text from '../config/Text';

function Footer() {
  return (
    <div
      className="w-full flex-shrink-0 bg-white border-t"
      style={{
        height: '6%',
        padding: '5%',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex justify-between items-center h-full">
        {/* First Block - Left Aligned */}
        <Text type="small" role="tertiary" className="text-left">
          @ICEPOPCLUB 2024
        </Text>

        {/* Second and Third Blocks - Grouped and Right Aligned */}
        <div className="flex space-x-[5%]">
          <a
            href="https://wa.me/your-whatsapp-number"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <Text
              type="small"
              role="tertiary"
              isClickable
              className="hover:underline hover:font-semibold text-center"
            >
              Message
            </Text>
          </a>
          <a
            href="/readme"
            className="flex items-center justify-center"
          >
            <Text
              type="small"
              role="tertiary"
              isClickable
              className="hover:underline hover:font-semibold text-center"
            >
              README
            </Text>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Footer;
