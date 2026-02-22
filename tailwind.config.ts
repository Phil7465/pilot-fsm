import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edf5ff",
          100: "#d6e8ff",
          200: "#a3ccff",
          300: "#6fb1ff",
          400: "#3c95ff",
          500: "#1b76e5",
          600: "#125cba",
          700: "#0a4288",
          800: "#062a57",
          900: "#021227",
        },
      },
    },
  },
  plugins: [],
};

export default config;
