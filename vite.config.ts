import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Proxy REST + WebSocket to backend during dev.
      // This makes ws(s)://<vite-host>/api/ws forward to http://localhost:8080/api/ws
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true
      }
    }
  },
});

