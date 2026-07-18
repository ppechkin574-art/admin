import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Standalone config (not merged into vite.config.ts) so `vitest` never
// picks up the dev-server proxy/port settings — it only needs the `@`
// alias to resolve imports the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
