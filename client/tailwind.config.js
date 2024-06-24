/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "blue-1": "#474973",
        "blue-2": "#1D264F",
        "blue-3": "#151b38",
        "peach": "#F1DAC4",
        "green-1": '#3B8583',
        "green-2": '#2f6a68',
      }
    },
  },
  plugins: [],
}

