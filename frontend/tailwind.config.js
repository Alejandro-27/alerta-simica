/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        seismic: {
          950: '#070d1a',
          900: '#0b1220',
          850: '#0e1626',
          800: '#111c30',
          700: '#1a2a45',
          600: '#22365c',
          500: '#2c4a7a',
          accent: '#f59e0b',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
