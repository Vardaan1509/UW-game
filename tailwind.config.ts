import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Only the theme tokens the game uses (primary, border). The colors come from
// CSS variables in src/index.css, matching the portfolio's light theme.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
    },
  },
  plugins: [animate],
} satisfies Config;
