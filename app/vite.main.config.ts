import { builtinModules } from "node:module";
import { defineConfig } from "vite";

const mainProcessExternals = [
  "electron",
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];

export default defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    lib: { entry: "src/main/main.ts", formats: ["cjs"], fileName: () => "main.js" },
    rollupOptions: {
      // Match Forge's Vite main-process base: bundle application dependencies but
      // leave Electron and every Node built-in for the Electron runtime.
      external: mainProcessExternals,
    },
  },
});
