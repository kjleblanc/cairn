import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The visual lab's dev config: the real renderer code, served to a plain
 * browser, against the lab's mock bridge. The lab entry lives outside
 * `src/` and nothing here feeds the shipped Electron bundle — main,
 * preload, and renderer configs are untouched, and the build output goes
 * to its own ignored directory.
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: ".vite/lab",
    rollupOptions: { input: "lab/index.html" },
  },
  server: { strictPort: false },
});
