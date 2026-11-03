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
          50: '#F1F7F6', // Anti-Flash White
          100: '#D8EDE6',
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
          50: '#F1F7F6',
          100: '#E4EEEC',
          200: '#C5D9D4',
          300: '#AACBC4',
          400: '#707D7D',
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
