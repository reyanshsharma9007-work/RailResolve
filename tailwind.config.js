/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ea580c",
        "primary-container": "#c2410c",
        "on-primary": "#ffffff",
        "on-primary-container": "#fff7ed",
        "primary-fixed": "#ffedd5",
        "primary-fixed-dim": "#fed7aa",
        "on-primary-fixed": "#431407",
        "secondary": "#f97316",
        "secondary-container": "#fb923c",
        "on-secondary": "#ffffff",
        "secondary-fixed": "#ffedd5",
        "secondary-fixed-dim": "#bec6e0",
        "surface": "#f7f9fb",
        "background": "#f7f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5f9",
        "surface-container": "#e2e8f0",
        "surface-container-high": "#cbd5e1",
        "surface-container-highest": "#94a3b8",
        "surface-variant": "#e0e3e5",
        "surface-bright": "#f7f9fb",
        "surface-dim": "#d8dadc",
        "surface-tint": "#ea580c",
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        "outline": "#94a3b8",
        "outline-variant": "#e2e8f0",
        "on-background": "#0f172a",
        "error": "#dc2626",
        "error-container": "#fee2e2",
        "on-error": "#ffffff",
        "on-error-container": "#991b1b",
        "tertiary": "#994100",
        "tertiary-container": "#c05400",
        "tertiary-fixed": "#ffdbca",
        "tertiary-fixed-dim": "#ffb690",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#fffbff",
        "on-tertiary-fixed": "#341100",
        "on-tertiary-fixed-variant": "#783200",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        "inverse-primary": "#ffb599",
        // Intermediate slate shade used by dark-mode hover states (e.g. the
        // evidence upload dropzone). Not part of Tailwind's stock palette.
        "slate-750": "#293548"
      },
      // `shadow-xs` is a Tailwind v4 utility and this project pins v3.4, so the
      // 12 call sites that use it emitted no CSS until it was defined here.
      boxShadow: {
        "xs": "0 1px 2px 0 rgb(15 23 42 / 0.04)"
      },
      // Login page uses `max-w-8xl`; stock Tailwind v3 stops at 7xl (80rem).
      maxWidth: {
        "8xl": "88rem"
      },
      // Drives `animate-fadeIn` on modals and navbar dropdowns. The matching
      // @keyframes fadeIn already lives in src/styles/index.css.
      animation: {
        "fadeIn": "fadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.25rem",
        "gutter": "1.25rem",
        "margin": "2rem",
        "margin-mobile": "1rem"
      },
      fontFamily: {
        "sans": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "code-ticker": ["Plus Jakarta Sans", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        "headline-lg": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "label-lg": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "title-md": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "body-sm": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "body-lg": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "display-hero": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "body-md": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        "label-md": ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
      }
    },
  },
  plugins: [],
}
