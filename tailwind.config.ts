import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        turquoise: "#29E7CD",
        night: "#011627",
        blue: "#2791D5",
        grayline: "#5D737E",
        alarm: "#F76666"
      }
    }
  },
  plugins: []
};

export default config;
