/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './_components/**/*.{js,ts,jsx,tsx}',
    './_hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Tailwind blue-600
        secondary: '#4f46e5', // Tailwind indigo-600
        success: '#16a34a', // green-600
        warning: '#d97706', // amber-600
        danger: '#dc2626', // red-600
      },
    },
  },
  plugins: [],
};