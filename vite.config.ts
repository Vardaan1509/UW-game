import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// The dev server only listens on this computer. To test on a phone on the same
// Wi-Fi, run `npm run dev -- --host` instead.
export default defineConfig({
  server: {
    host: "localhost",
    port: 8081,
  },
  plugins: [react()],
});
