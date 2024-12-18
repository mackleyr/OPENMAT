// src/config/Colors.js

// Define the main color for the app (primary color)
export const mainColor = '#1A1A1A'; // Black
export const minorColor = '#EBEBEB'; // White

// Define the color scheme for different button and component states
export const colorScheme = {
  primary: {
    background: mainColor,
    hover: minorColor,
    text: '#FFFFFF',
    border: mainColor,
  },
  secondary: {
    background: 'transparent',
    hover: mainColor,
    text: '#FFFFFF',
    hoverText: '#FFFFFF',
    border: mainColor,
  },
  inactive: {
    background: '#E0E0E0',
    hover: minorColor,
    text: '#9E9E9E',
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    blur: 'blur(10px)',
    shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  },
  active: {
    background: mainColor,
    text: '#FFFFFF',
  },
};

// Define text colors for different roles
export const textColors = {
  mainColor: mainColor, // Main color
  primary: '#000000',   // Black text
  secondary: '#6B7280', // Gray text
  tertiary: '#D1D5DB',  // Light gray
  white: '#FFFFFF', // White text
};

// Export color scheme and text colors
export default {
  mainColor,
  colorScheme,
  textColors,
};
