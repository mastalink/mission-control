import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dunder: {
          blue: "#1a365d",
          paper: "#f5f0e8",
          carpet: "#8b7355",
          wall: "#d4c5a9",
          desk: "#6b4c30",
          screen: {
            off: "#1e293b",
            on: "#3b82f6",
            error: "#ef4444",
          },
        },
      },
      fontFamily: {
        dunder: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
