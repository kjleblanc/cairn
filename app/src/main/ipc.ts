import { dialog, ipcMain, shell } from "electron";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { initProject, isCairnProject, projectStatus } from "@cairn/core";
import type { InitInput, Preflight, ProjectList, RecentProject, Result } from "../shared/ipc.js";
import { logError, plainMessage } from "./log.js";
import { recentDirs, touchProject } from "./registry.js";

function toResult<T>(context: string, fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  }
}

async function preflight(): Promise<Preflight> {
  if (process.env.CAIRN_MOCK === "1") return { claudeReady: true, reason: null };
  try {
    await import("@anthropic-ai/claude-agent-sdk");
  } catch (err) {
    logError("preflight", err);
    return { claudeReady: false, reason: "no-sdk" };
  }
  const home = homedir();
  const signedIn =
    existsSync(path.join(home, ".claude", ".credentials.json")) ||
    existsSync(path.join(home, ".claude.json"));
  return signedIn ? { claudeReady: true, reason: null } : { claudeReady: false, reason: "no-login" };
}

export function registerProjectIpc(): void {
  void preflight().then((r) => console.log("[cairn] preflight:", JSON.stringify(r)));

  ipcMain.handle("preflight:check", () => preflight());

  ipcMain.handle("project:list", (): ProjectList => {
    const recent: RecentProject[] = recentDirs().map((dir) => {
      try {
        const s = projectStatus(dir);
        return { dir, ok: true, name: s.facts.name, milestone: s.facts.milestone, stones: s.stones };
      } catch {
        return { dir, ok: false, name: path.basename(dir), milestone: "", stones: 0 };
      }
    });
    return { recent, autoOpen: process.env.CAIRN_OPEN ?? null };
  });

  ipcMain.handle("project:pickFolder", async (): Promise<string | null> => {
    const res = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  });

  ipcMain.handle("project:open", (_e, dir: string) =>
    toResult("project:open", () => {
      if (!isCairnProject(dir)) {
        throw new Error("That folder has no Cairn contract. Start a new project in an empty folder, or see Project Conversion in the guides for existing work.");
      }
      const s = projectStatus(dir);
      touchProject(dir);
      return s;
    }));

  ipcMain.handle("project:init", (_e, input: InitInput) =>
    toResult("project:init", () => {
      const entries = existsSync(input.dir) ? readdirSync(input.dir).filter((e) => e !== ".git") : [];
      if (entries.length > 0) {
        throw new Error("That folder isn't empty. A new project needs an empty folder — for existing work, see Project Conversion in the guides.");
      }
      initProject(input.dir, input);
      const s = projectStatus(input.dir);
      touchProject(input.dir);
      return s;
    }));

  ipcMain.handle("project:status", (_e, dir: string) => toResult("project:status", () => projectStatus(dir)));

  ipcMain.handle("app:openExternal", async (_e, url: string) => {
    if (!/^https:\/\/(github\.com\/kjleblanc\/|kjleblanc\.github\.io\/|claude\.com\/)/.test(url)) return;
    await shell.openExternal(url);
  });
}
