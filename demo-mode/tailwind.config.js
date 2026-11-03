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
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          // Darkened for WCAG AA (≥4.5:1) with white text on solid CTAs
          600: '#0369a1',
          700: '#075985',
          800: '#075985',
          900: '#0c4a6e',
        },
        /** Branded sky cards / navy chrome — see .cursor/rules/color-scheme.mdc */
        brand: {
          sky: '#74b4e0',
          ink: '#0b1b33',
        },
      },
    },
  },
  plugins: [],
}
