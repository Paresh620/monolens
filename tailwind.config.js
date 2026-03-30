/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f0f0f5',
          100: '#d4d4e0',
          200: '#a8a8c0',
          300: '#7c7ca0',
          400: '#505080',
          500: '#2d2d50',
          600: '#1e1e3a',
          700: '#16162d',
          800: '#0f0f20',
          900: '#0a0a16',
          950: '#06060e',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
          pink: '#ec4899',
        },
      },
    },
  },
  plugins: [],
};
