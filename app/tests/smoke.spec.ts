import { _electron as electron, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Core is ESM and Playwright transpiles specs to CJS, so the scaffold runs in a
// node subprocess instead of being imported here.
function scaffold(proj: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Smoke", what: "w", who: "me", milestone: "see it", timebox: "default" });`,
    proj,
  ]);
}

test("the full mock loop drops a stone", async () => {
  const proj = mkdtempSync(join(tmpdir(), "cairn-smoke-"));
  scaffold(proj);

  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: proj },
  });
  const win = await app.firstWindow();

  await expect(win.getByRole("button", { name: "Start a task" })).toBeVisible();
  await win.getByRole("button", { name: "Start a task" }).click();

  await win.getByPlaceholder("The home page shows my list of books").fill("A demo file appears");
  await win.getByRole("button", { name: "Write the brief" }).click();

  await win.getByRole("button", { name: "Approve this exact brief" }).click();

  await win.getByRole("button", { name: "Skip to the decision" }).click();

  await win.getByRole("button", { name: "Accept — it does what I wanted" }).click();
  await win.getByPlaceholder("What did you personally see?").fill("demo.txt exists");
  await win.getByRole("button", { name: "Yes", exact: true }).click();
  await win.getByRole("button", { name: "Close the task — a stone on your cairn" }).click();

  await expect(win.getByText("▸ idle · 1 stone · gate quiet")).toBeVisible();
  await app.close();
});
