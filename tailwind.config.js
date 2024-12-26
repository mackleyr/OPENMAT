// tailwind.config.js
const colors = require('tailwindcss/colors');

module.exports = {
  // Tailwind v3+ uses 'content' instead of 'purge'
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        main: '#3182ce',
        inactiveBg: colors.gray[100],
        inactiveText: colors.gray[300],
      },
      borderRadius: {
        xl: '1.25rem',
        full: '9999px',
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
