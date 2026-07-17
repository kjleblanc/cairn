// Copies the canonical contract into the CLI's assets so the published package
// is self-contained. Run via `npm run sync-contract` (part of `npm run build`).
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "CONTRACT-TEMPLATE.md");
const target = join(here, "..", "assets", "contract.md");

if (!existsSync(source)) {
  console.error("CONTRACT-TEMPLATE.md not found — run from the cairn repo.");
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("assets/contract.md synced from CONTRACT-TEMPLATE.md");
