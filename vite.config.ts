import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 3001,
      host: true,
      proxy: {
        "/api": {
          target: "http://backend:8000", // Измените на localhost
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""), // Убираем /api из пути
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  };
});
