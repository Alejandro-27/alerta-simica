/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--color-surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--color-surface-3) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--color-line-strong) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        'body-muted': 'rgb(var(--color-body-muted) / <alpha-value>)',
        'body-faint': 'rgb(var(--color-body-faint) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-subtle': 'rgb(var(--color-accent-subtle) / <alpha-value>)',
        // Severity tokens
        'sev-low': 'rgb(var(--color-sev-low) / <alpha-value>)',
        'sev-moderate': 'rgb(var(--color-sev-moderate) / <alpha-value>)',
        'sev-strong': 'rgb(var(--color-sev-strong) / <alpha-value>)',
        'sev-critical': 'rgb(var(--color-sev-critical) / <alpha-value>)',
        // Legacy seismic palette (kept for fallback)
        seismic: {
          950: '#050a14',
          900: '#081020',
          850: '#0b1526',
          800: '#0f1b30',
          700: '#182742',
          600: '#22365c',
          500: '#2f4a7d',
          accent: '#2dd4bf',
        },
        accent: '#2dd4bf',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -12px rgba(0,0,0,0.55)',
        'card-light': '0 1px 0 rgba(0,0,0,0.04) inset, 0 4px 16px -4px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
