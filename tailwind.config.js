/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Official brand palette (green / teal).
         * See `.cursor/rules/color-scheme.mdc` + `Documentation/images/color-scheme.png`.
         */
        primary: {
          // Keep 50/100 distinct from gray-50 so light tinted panels stay visible
          50: '#E3F5EF',
          100: '#C8EBDF',
          200: '#AACBC4', // Pistachio
          300: '#2FA98C', // Mint
          400: '#2CC295', // Mountain Meadow
          500: '#00DF81', // Caribbean Green (accent / focus)
          600: '#03624C', // Bangladesh Green (CTA)
          700: '#095544', // Forest
          800: '#0B453A', // Basil
          900: '#032221', // Dark Green
        },
        brand: {
          sky: '#2CC295', // Mountain Meadow — branded cards
          ink: '#020F11', // Rich Black — titles / navy tabs
          rich: '#020F11',
          dark: '#032221',
          pine: '#06302B',
          caribbean: '#00DF81',
          meadow: '#2CC295',
          mint: '#2FA98C',
          frog: '#17876D',
          forest: '#095544',
          basil: '#0B453A',
          stone: '#707D7D',
          pistachio: '#AACBC4',
          antiFlash: '#F1F7F6',
        },
        /** Green-tinted neutrals so gray-* utilities match the brand */
        gray: {
          50: '#F1F7F6', // page canvas (Anti-Flash)
          100: '#E2ECE9', // soft fills (must differ from white)
          200: '#C5D4D0', // **default light borders** (visible on white cards)
          300: '#9BB0AB',
          400: '#707D7D', // Stone
          500: '#5C6A6A',
          600: '#4A5757',
          700: '#2A3F3C',
          800: '#06302B',
          900: '#032221',
          950: '#020F11',
        },
      },
    },
  },
  plugins: [],
}
