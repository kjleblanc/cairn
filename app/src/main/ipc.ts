import { app, dialog, ipcMain, shell } from "electron";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { initProject, isCairnProject, projectStatus } from "@cairn/core";
import type {
  ConductorConnectRequest,
  ConductorConsentCard,
  ConductorDelta,
  ConductorSendRequest,
  ConductorStatus,
  InitInput,
  Preflight,
  ProjectList,
  RecentProject,
  Result,
  UpdateInfo,
} from "../shared/ipc.js";
import * as conductorService from "./conductor/service.js";
import { logError, plainMessage } from "./log.js";
import { forgetProject, recentEntries, touchProject } from "./registry.js";

function toResult<T>(context: string, fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    logError(context, err);
    return { ok: false, message: plainMessage(err) };
  }
}

async function preflight(): Promise<Preflight> {
  const mock = process.env.CAIRN_MOCK === "1";
  return { mock, mode: mock ? "offline-demo" : "connection-required" };
}

export function registerProjectIpc(): void {
  void preflight().then((r) => console.log("[cairn] preflight:", JSON.stringify(r)));

  ipcMain.handle("preflight:check", () => preflight());

  ipcMain.handle("project:list", (): ProjectList => {
    const recent: RecentProject[] = recentEntries().map(({ dir, lastOpened }) => {
      try {
        const s = projectStatus(dir);
        return { dir, ok: true, name: s.facts.name, milestone: s.facts.milestone, stones: s.stones, lastOpened };
      } catch {
        return { dir, ok: false, name: path.basename(dir), milestone: "", stones: 0, lastOpened };
      }
    });
    return { recent, autoOpen: process.env.CAIRN_OPEN ?? null };
  });

  ipcMain.handle("project:forget", (_e, dir: string) =>
    toResult("project:forget", () => {
      forgetProject(dir);
      return null;
    }));

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

  ipcMain.handle("app:updateCheck", async (): Promise<UpdateInfo> => {
    const current = app.getVersion();
    try {
      const res = await fetch("https://api.github.com/repos/kjleblanc/cairn/releases/latest", {
        headers: { accept: "application/vnd.github+json" },
      });
      if (!res.ok) return { current, latest: null, newer: false };
      const data = (await res.json()) as { tag_name?: string };
      const latest = (data.tag_name ?? "").replace(/^v/, "") || null;
      const newer = latest !== null && latest.localeCompare(current, undefined, { numeric: true }) > 0;
      return { current, latest, newer };
    } catch (err) {
      logError("updateCheck", err);
      return { current, latest: null, newer: false };
    }
  });

  ipcMain.handle("app:openExternal", async (_e, url: string) => {
    // Task 030 added the openrouter.ai prefix so the connect card's "Where
    // do I get a key?" walkthrough can open the Keys page directly.
    if (!/^https:\/\/(github\.com\/kjleblanc\/|kjleblanc\.github\.io\/|openrouter\.ai\/)/.test(url)) return;
    await shell.openExternal(url);
  });
}

/** Registered separately from `registerProjectIpc` for clarity, but called
 * unconditionally from `main.ts` — these channels are always reachable; the
 * chat screen that reaches them is the app's home view for a governed
 * project (0.1.0), with no separate flag gating whether it shows. */
export function registerConductorIpc(): void {
  ipcMain.handle("conductor:status", (): ConductorStatus => conductorService.status());

  ipcMain.handle("conductor:consentCard", (_e, baseUrl: string, model: string): Result<ConductorConsentCard> => {
    try {
      return { ok: true, value: conductorService.conductorConsentCard(baseUrl, model) };
    } catch (err) {
      // A malformed base URL is an expected state while the owner is still
      // typing, not a fault — declined quietly, never logged as an error.
      return { ok: false, message: plainMessage(err) };
    }
  });

  ipcMain.handle("conductor:connect", (_e, request: ConductorConnectRequest): Result<null> => {
    try {
      return conductorService.connect(request);
    } catch (err) {
      logError("conductor:connect", err);
      return { ok: false, message: plainMessage(err) };
    }
  });

  ipcMain.handle("conductor:disconnect", () =>
    toResult("conductor:disconnect", () => {
      conductorService.disconnect();
      return null;
    }));

  ipcMain.handle("conductor:setModel", (_e, model: string) =>
    toResult("conductor:setModel", () => {
      conductorService.setModel(model);
      return null;
    }));

  ipcMain.handle("conductor:send", (event, request: ConductorSendRequest): Result<{ conversationId: string }> => {
    try {
      return conductorService.send(request.dir, request.conversationId, request.text, (delta: ConductorDelta) => {
        event.sender.send("conductor:delta", delta);
      });
    } catch (err) {
      logError("conductor:send", err);
      return { ok: false, message: plainMessage(err) };
    }
  });

  ipcMain.handle("conductor:stop", (_e, dir: string) =>
    toResult("conductor:stop", () => {
      conductorService.stop(dir);
      return null;
    }));

  ipcMain.handle("conductor:conversations", (_e, dir: string) => conductorService.conversations(dir));

  ipcMain.handle("conductor:turns", (_e, dir: string, id: string) => conductorService.turns(dir, id));
}
