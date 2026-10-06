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
        docmind: {
          bg: "#0B1020",
          panel: "#151D35",
          elevated: "#1C2742",
          border: "#34425D",
          text: "#F4F7FC",
          muted: "#B5C1D4",
          cyan: "#56E6E0",
          violet: "#A78BFA",
          amber: "#FBBF24",
          rose: "#F87171",
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 12px rgba(86, 230, 224, 0.4))" },
          "50%": { opacity: "0.7", filter: "drop-shadow(0 0 4px rgba(86, 230, 224, 0.1))" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        }
      }
    },
  },
  plugins: [],
}
