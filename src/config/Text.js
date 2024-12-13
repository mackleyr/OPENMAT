// src/config/Text.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { mainColor, textColors } from './Colors';

const textStyles = {
  large: 'text-lg sm:text-1xl md:text-2xl lg:text-3xl font-semibold',
  medium: 'text-md sm:text-1xl md:text-xl lg:text-2xl font-medium',
  small: 'text-sm sm:text-md md:text-lg lg:text-1xl font-medium',
};

const Text = ({ type, role = 'primary', isClickable = false, children, className, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle = textStyles[type] || '';
  const roleColor = isHovered && isClickable ? mainColor : textColors[role] || textColors.primary;

  return (
    <span
      className={`${baseStyle} ${className || ''}`}
      style={{
        color: roleColor,
        cursor: isClickable ? 'pointer' : 'default', // Add pointer cursor for clickable text
      }}
      onMouseEnter={() => isClickable && setIsHovered(true)}
      onMouseLeave={() => isClickable && setIsHovered(false)}
      {...props}
    >
      {children}
    </span>
  );
};

Text.propTypes = {
  type: PropTypes.oneOf(['large', 'medium', 'small']).isRequired,
  role: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'white']),
  isClickable: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Text;
