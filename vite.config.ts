import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Warn in dev when the backend is not reachable on :8080. */
function backendHealthCheck(): Plugin {
  return {
    name: "backend-health-check",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        fetch("http://127.0.0.1:8080/api/stats")
          .then((res) => {
            if (!res.ok) {
              console.warn("\n[vite] Backend on :8080 returned non-OK status. API proxy may fail.\n");
            }
          })
          .catch(() => {
            console.warn(
              "\n[vite] Backend not running on http://localhost:8080.\n" +
                "       Start both apps from project root: npm run dev\n" +
                "       Or run server separately: npm run dev:server\n",
            );
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), backendHealthCheck()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Proxy REST + WebSocket to backend during dev.
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
