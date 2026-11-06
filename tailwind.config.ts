import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B0D",
        card: "#18181B",
        "card-hover": "#222227",
        accent: {
          DEFAULT: "#DFFF00",
          hover: "#c8e600",
          muted: "rgba(223, 255, 0, 0.15)",
        },
        borderDark: "#27272A",
        secondaryText: "#A1A1AA",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(223, 255, 0, 0.25)",
        "glow-lg": "0 0 40px -5px rgba(223, 255, 0, 0.35)",
        "card-glow": "0 10px 30px -10px rgba(0, 0, 0, 0.8)",
      },
      keyframes: {
        pulseLime: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        pulseLime: "pulseLime 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;

