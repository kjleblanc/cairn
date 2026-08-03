import { _electron as electron, expect } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Legacy", what: "w", who: "me", milestone: "see it" });`,
    project,
  ]);
}

test("legacy state is preserved and the project conversion path remains visible", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-legacy-ui-"));
  scaffold(project);
  const legacyDir = join(project, ".git", "cairn");
  mkdirSync(legacyDir);
  const evidence = join(legacyDir, "opaque.txt");
  writeFileSync(evidence, "preserve exactly\n");

  const app = await electron.launch({ args: ["."], env: { ...process.env, CAIRN_MOCK: "1", CAIRN_OPEN: project } });
  const window = await app.firstWindow();
  // A governed project boots straight into chat; the dashboard is one click away.
  const projectHome = window.getByRole("button", { name: "← Project home" });
  await expect(projectHome).toBeVisible({ timeout: 30_000 });
  await projectHome.click();

  await expect(window.getByText("Legacy task state is preserved.")).toBeVisible();
  await expect(window.getByRole("button", { name: "Start a task" })).not.toBeVisible();
  expect(readFileSync(evidence, "utf8")).toBe("preserve exactly\n");

  await window.getByRole("button", { name: "Switch project" }).click();
  await window.getByRole("button", { name: "All projects" }).click();
  await expect(window.getByText("bring an existing project")).toBeVisible();
  // Task 161 rewrote this screen and moved its legacy sentence into Convert.tsx,
  // leaving this assertion pinned to copy the app no longer shows. This is the
  // successor promise on the same screen (Picker.tsx:177): the conversion path
  // is visible AND it still promises to preserve whatever it finds.
  await expect(window.getByText(/nothing is overwritten, moved, or deleted/)).toBeVisible();
  expect(readFileSync(evidence, "utf8")).toBe("preserve exactly\n");
  await app.close();
});
