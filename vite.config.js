import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Las librerias pesadas van a su propio chunk: cambian mucho menos que
        // el codigo de la app, asi el navegador las cachea entre despliegues.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          alerts: ["sweetalert2", "sweetalert2-react-content"],
        },
      },
    },
  },
});
