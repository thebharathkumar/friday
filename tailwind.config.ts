import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nox: {
          bg: "#07090c",
          panel: "#0c1015",
          line: "#1a2230",
          ink: "#d8e1ee",
          dim: "#6b7a8f",
          accent: "#7cc4ff",
          warn: "#ffb454",
          alert: "#ff5d6c",
          ok: "#7be3a4",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
