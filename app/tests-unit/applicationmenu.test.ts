import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const main = readFileSync(join(process.cwd(), "src", "main", "main.ts"), "utf8");

test("the desktop window has no application menu bar", () => {
  assert.match(main, /import \{[^}]*\bMenu\b[^}]*\} from "electron";/u);

  const createWindow = main.slice(main.indexOf("export function createWindow"));
  assert.match(createWindow, /Menu\.setApplicationMenu\(null\);[\s\S]*?new BrowserWindow\(/u);
});

test("the desktop title bar keeps its window controls without Cairn branding", () => {
  const createWindow = main.slice(main.indexOf("export function createWindow"));
  assert.match(createWindow,
    /new BrowserWindow\(\{[\s\S]*?titleBarStyle: "hidden",[\s\S]*?titleBarOverlay: \{[\s\S]*?color: "#dbdcdd",[\s\S]*?symbolColor: "#0d2634",[\s\S]*?height: 41,[\s\S]*?\},/u);
});
