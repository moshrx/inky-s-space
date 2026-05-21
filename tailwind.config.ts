import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#03050d",
          900: "#070a18",
          800: "#0c1126",
          700: "#131a36",
          600: "#1d2548",
        },
        ink: {
          gold: "#f4d58d",
          silver: "#e8edf7",
          mist: "#9aa3c2",
          faded: "#5b6488",
        },
        emo: {
          longing: "#c084fc",
          quiet: "#7dd3fc",
          fire: "#fb923c",
          drift: "#a7f3d0",
          anchor: "#fcd34d",
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', '"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['var(--font-sans)', '"Inter"', "system-ui", "sans-serif"],
      },
      animation: {
        twinkle: "twinkle 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        breathe: "breathe 8s ease-in-out infinite",
        drift: "drift 30s linear infinite",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "33%": { transform: "translateY(-6px) translateX(3px)" },
          "66%": { transform: "translateY(4px) translateX(-2px)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.6", filter: "blur(0.4px)" },
          "50%": { opacity: "1", filter: "blur(0px)" },
        },
        drift: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
