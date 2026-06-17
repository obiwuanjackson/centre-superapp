import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0e7490", dark: "#155e75", light: "#06b6d4" },
      },
    },
  },
  plugins: [],
};
export default config;
