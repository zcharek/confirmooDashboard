import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/confirmooDashboard/",
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false, // Désactive l'overlay d'erreur HMR
    },
    proxy: {
      '/api/qase': {
        target: 'https://api.qase.io/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/qase/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Token', 'bea8b711a16a7f25442134a3c148eeccccbfe83687da4d763ce07eccda803e5a');
          });
        },
      },
    },
  },
  logLevel: "error", // Réduit les logs au minimum (seulement les erreurs)
  clearScreen: false, // Garde l'écran de terminal propre
});
