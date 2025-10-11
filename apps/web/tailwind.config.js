/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eaf6fd',
          100: '#d6ecfb',
          200: '#add9f7',
          300: '#85c6f2',
          400: '#5cb3ee',
          500: '#2d8fc4', // primary
          600: '#1f6c93',
          700: '#1a5a7a',
          800: '#154962',
          900: '#0f3648',
        },
        brand2: '#015a8b',
        brand3: '#64bae2',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

module.exports = config;

