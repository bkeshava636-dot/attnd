/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gotham: {
          950: '#07080c', // near-black primary background
          900: '#0c0e15', // charcoal secondary background
          850: '#11141e', // card dark graphite
          800: '#171b28', // card elevated surface
          750: '#1f2436', // surface border
          700: '#2a3148', // subtle border / divider
          600: '#434d6d',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        bat: {
          gold: '#eab308',     // primary Batman yellow / gold
          accent: '#facc15',   // bright highlight gold
          muted: '#ca8a04',    // muted brass
          dark: '#713f12',     // deep gold/brown
          glow: 'rgba(234, 179, 8, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'bat-glow': '0 0 20px -3px rgba(234, 179, 8, 0.25)',
        'bat-glow-sm': '0 0 10px -2px rgba(234, 179, 8, 0.2)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'card-dark-hover': '0 6px 24px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(234, 179, 8, 0.25)',
      },
    },
  },
  plugins: [],
}
