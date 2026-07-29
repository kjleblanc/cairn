import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const labIndexPath = fileURLToPath(new URL("./lab/index.html", import.meta.url));

/**
 * Kimi Work's preview card opens the site root. Serve the lab there too,
 * with its script made absolute so relative lab imports keep resolving.
 */
const labAtRoot: Plugin = {
  name: "cairn-lab-at-root",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? "/").split("?")[0];
      if (path !== "/" && path !== "/index.html") {
        next();
        return;
      }
      const source = readFileSync(labIndexPath, "utf8")
        .replace('src="./main.tsx"', 'src="/lab/main.tsx"');
      server.transformIndexHtml(req.url ?? "/", source)
        .then((html) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
        })
        .catch(next);
    });
  },
};

/**
 * The visual lab's dev config: the real renderer code, served to a plain
 * browser, against the lab's mock bridge. The lab entry lives outside
 * `src/` and nothing here feeds the shipped Electron bundle — main,
 * preload, and renderer configs are untouched, and the build output goes
 * to its own ignored directory.
 */
export default defineConfig({
  base: "./",
  plugins: [labAtRoot, react()],
  build: {
    outDir: ".vite/lab",
    rollupOptions: { input: "lab/index.html" },
  },
  server: { strictPort: false },
});
