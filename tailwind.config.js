// tailwind.config.js
const colors = require('tailwindcss/colors');

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        main: '#3182ce',       // Your main color
        inactiveBg: colors.gray[100],
        inactiveText: colors.gray[300],
      },
      borderRadius: {
        xl: '1.25rem',
        full: '9999px',        // Used for fully rounded corners
      },
    },
  },
  variants: {
    extend: {
      display: ['group-hover'],
      opacity: ['disabled'],
    },
  },
  plugins: [],
};
