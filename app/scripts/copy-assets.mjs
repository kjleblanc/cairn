// The contract template ships as an Electron extraResource; in dev it is read
// from this same copy. Core's sync-contract (run by core's build) keeps
// core/assets/contract.md current from CONTRACT-TEMPLATE.md.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "core", "assets", "contract.md");
const target = join(here, "..", "resources", "contract.md");

if (!existsSync(source)) {
  console.error("core/assets/contract.md not found — run `npm run build -w @cairn/core` at the repo root first.");
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("resources/contract.md synced from core");
