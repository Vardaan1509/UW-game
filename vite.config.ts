import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Port 8081 so this can run alongside the portfolio dev server (8080).
export default defineConfig({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react()],
});
