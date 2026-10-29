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
        lumina: {
          navy: "#081C6C",
          "navy-dark": "#051245",
          "navy-light": "#0E2A9E",
          emerald: "#10B981",
          "emerald-dark": "#059669",
          "emerald-light": "#34D399",
          alert: "#EF4444",
          surface: "#F8FAFC",
          card: "#FFFFFF",
          border: "rgba(226, 232, 240, 0.8)",
        },
      },
      borderRadius: {
        "2xl": "16px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
