import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0a0b0f",
        panel: "#12141c",
        edge: "#22253433",
        signal: "#5eead4",
        veil: "#a78bfa",
      },
    },
  },
  plugins: [],
};

export default config;
