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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -12px rgba(0,0,0,0.55)',
        'card-light': '0 1px 0 rgba(0,0,0,0.04) inset, 0 4px 16px -4px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        // Shared easing: fast start, graceful settle
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
