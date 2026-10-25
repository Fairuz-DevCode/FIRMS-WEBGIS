/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        sipongi: {
          green: '#16a34a',
          yellow: '#ca8a04',
          red: '#dc2626',
        },
        prims: {
          900: '#244616',
          700: '#366127',
          800: '#2b501e',
        },
      },
      keyframes: {
        popover: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        popover: 'popover 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
