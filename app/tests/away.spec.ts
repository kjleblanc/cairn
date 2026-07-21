import { _electron as electron, expect, test } from "@playwright/test";
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
  await expect(window.getByText("Legacy task state is preserved.")).toBeVisible({ timeout: 30_000 });
  await expect(window.getByRole("button", { name: "Start a task" })).not.toBeVisible();
  expect(readFileSync(evidence, "utf8")).toBe("preserve exactly\n");

  await window.getByRole("button", { name: "Switch project" }).click();
  await window.getByRole("button", { name: "All projects" }).click();
  await expect(window.getByText("bring an existing project")).toBeVisible();
  await expect(window.getByText(/does not transform legacy/)).toBeVisible();
  expect(readFileSync(evidence, "utf8")).toBe("preserve exactly\n");
  await app.close();
});
