/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2d8fc4",
          dark: "#0a1b28",
          light: "#64bae2",
        },
      },
      borderRadius: {
        "2xl": "1rem",
      },
      boxShadow: {
        glass: "0 8px 30px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
