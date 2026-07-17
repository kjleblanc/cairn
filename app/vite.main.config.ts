import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: ".vite/build",
    emptyOutDir: false,
    lib: { entry: "src/main/main.ts", formats: ["cjs"], fileName: () => "main.js" },
    rollupOptions: {
      // Rollup 4 keeps dynamic import() live in CJS output, so core's
      // `await import("@anthropic-ai/claude-agent-sdk")` still loads the ESM SDK.
      external: ["electron", "electron-squirrel-startup", "@anthropic-ai/claude-agent-sdk", /^node:/],
    },
  },
});
