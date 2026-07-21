import { rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(packageRoot, "dist");
if (dirname(target) !== packageRoot || target !== join(packageRoot, "dist")) {
  throw new Error("Refusing to clean anything except cli/dist.");
}
rmSync(target, { recursive: true, force: true });
