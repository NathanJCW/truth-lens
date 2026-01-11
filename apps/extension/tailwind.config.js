/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: [
    "./content.tsx",
    "./popup.tsx",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}