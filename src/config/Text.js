// src/config/Text.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { mainColor, textColors } from './Colors';

const textStyles = {
  large: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold',
  medium: 'text-md sm:text-lg md:text-xl lg:text-2xl font-medium',
  small: 'text-sm sm:text-md md:text-lg lg:text-1xl font-medium',
};

function Text({
  type,
  role = 'primary',
  isClickable = false,
  children,
  className = '',
  style = {},
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle = textStyles[type] || '';
  // If role is invalid, fall back to primary
  const roleColor = isHovered && isClickable
    ? mainColor // Hover color for clickable text
    : textColors[role] || textColors.primary; // fallback black

  return (
    <span
      className={`${baseStyle} ${className}`}
      style={{
        color: roleColor, // Inline color => show up in DevTools
        cursor: isClickable ? 'pointer' : 'default',
        ...style,         // Spread any inline style override
      }}
      onMouseEnter={() => isClickable && setIsHovered(true)}
      onMouseLeave={() => isClickable && setIsHovered(false)}
      {...props}
    >
      {children}
    </span>
  );
}

Text.propTypes = {
  type: PropTypes.oneOf(['large', 'medium', 'small']).isRequired,
  role: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'white']),
  isClickable: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Text;
