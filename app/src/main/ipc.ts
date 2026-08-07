import { app, dialog, ipcMain, shell } from "electron";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { convertProject, initProject, inspectConversion, isCairnProject, projectStatus } from "@cairn/core";
import type {
  ConductorConnectRequest,
  ConductorConsentCard,
  ConductorDelta,
  ConductorOAuthEvent,
  ConductorOAuthRequest,
  ConductorRenewConsentRequest,
  ConductorSendRequest,
  ConductorStatus,
  InitInput,
  Preflight,
  ProjectList,
  PushPreview,
  PushResult,
  RecentProject,
  Result,
  TownPresentationState,
  UpdateInfo,
} from "../shared/ipc.js";
import * as conductorService from "./conductor/service.js";
import { emitBridgeSync } from "./bridge/hub.js";
import { phoneBridgePairBegin, phoneBridgeRevokeDevice, phoneBridgeState } from "./bridge/runtime.js";
import { logError, plainMessage } from "./log.js";
import { pushExecute, pushPreview, pushRefusal } from "./push.js";
import { runCheckup } from "./checkup.js";
import { forgetProject, recentEntries, touchProject } from "./registry.js";
import { currentTaskSession } from "./tasks.js";
import { readTownState, writeTownState } from "./townstore.js";

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
        const task = currentTaskSession(dir);
        const stream = conductorService.current(dir);
        const activity = task?.phase === "running"
          ? "working"
          : stream !== null
            ? "thinking"
            : task?.phase === "closed"
              ? "complete"
              : "idle";
        const tasks: RecentProject["tasks"] = [];
        if (task?.phase === "running") {
          tasks.push({ id: "running", label: "Running", summary: task.outcome, state: "running" });
        }
        if (s.unfinished) {
          const label = String(s.unfinished.taskNumber).padStart(3, "0");
          tasks.push({
            id: `unfinished-${label}`,
            label,
            summary: s.unfinished.briefText.match(/^Requested outcome:\s*(.+)$/mi)?.[1] ?? "Retained task evidence",
            state: "unfinished",
          });
        }
        for (const row of [...s.log].reverse().slice(0, 6)) {
          tasks.push({
            id: `closed-${row.task}`,
            label: row.task,
            summary: row.summary || row.decision,
            state: /^DONE$/i.test(row.outcome.trim()) ? "done" : "stopped",
          });
        }
        return {
          dir,
          ok: true,
          name: s.facts.name,
          milestone: s.facts.milestone,
          stones: s.stones,
          lastOpened,
          activity,
          tasks,
        };
      } catch {
        return {
          dir,
          ok: false,
          name: path.basename(dir),
          milestone: "",
          stones: 0,
          lastOpened,
          activity: "idle",
          tasks: [],
        };
      }
    });
    return { recent, autoOpen: process.env.CAIRN_OPEN ?? null };
  });

  ipcMain.handle("project:forget", (_e, dir: string) =>
    toResult("project:forget", () => {
      forgetProject(dir);
      return null;
    }));

  // Task 160: one read-only health audit, run on demand from the picker. The
  // handler adds nothing to the module's own guarantees — no writes, no
  // network, no model call — it only reports what runCheckup found.
  ipcMain.handle("project:checkup", (_e, dir: string) =>
    toResult("project:checkup", () => runCheckup(dir)));

  ipcMain.handle("project:pickFolder", async (): Promise<string | null> => {
    // Test seam (same family as CAIRN_OPEN): E2E specs cannot drive the
    // native dialog, so a set path stands in for the owner's pick.
    if (process.env.CAIRN_TEST_PICK_FOLDER) return process.env.CAIRN_TEST_PICK_FOLDER;
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
      conductorService.noteCurrentProject(dir);
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
      conductorService.noteCurrentProject(input.dir);
      return s;
    }));

  // Task 161: conversion, the button form of PROJECT-CONVERSION.md. Inspect
  // is strictly read-only; convert only ever creates new paths and commits
  // them by exact path when git allows (core's convertProject holds the law).
  ipcMain.handle("project:convertInspect", (_e, dir: string) =>
    toResult("project:convertInspect", () => inspectConversion(dir)));

  ipcMain.handle("project:convert", (_e, input: InitInput) =>
    toResult("project:convert", () => {
      const outcome = convertProject(input.dir, input);
      const s = projectStatus(input.dir);
      touchProject(input.dir);
      conductorService.noteCurrentProject(input.dir);
      return { status: s, outcome };
    }));

  ipcMain.handle("project:status", (_e, dir: string) => toResult("project:status", () => projectStatus(dir)));

  ipcMain.handle("town:load", (_e, dir: string) =>
    toResult("town:load", () => {
      projectStatus(dir);
      return readTownState(dir);
    }));

  ipcMain.handle("town:save", (_e, dir: string, state: TownPresentationState) =>
    toResult("town:save", () => {
      projectStatus(dir);
      return writeTownState(dir, state);
    }));

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

  // Task 10's push machinery: local-only preview, one honest push. Task 11
  // built the chip and the owner-facing confirmation on top of it.
  ipcMain.handle("push:preview", (_e, dir: string): PushPreview | null => pushPreview(dir));

  // The preview rides the request because the push is pinned to exactly what
  // the confirmation panel disclosed — it is the panel's own preview object,
  // not anything re-derived here. Re-reading git at this point would reopen
  // the gap the pinning closes.
  //
  // But pinning also means caller-supplied strings reach git's argv — as the
  // remote (where git accepts a URL) and as both halves of the refspec (where
  // `+` forces and an empty source deletes a branch). Before pinning, a bare
  // push could only reach the configured upstream and could send only HEAD;
  // after it, main would bound neither. This handler restores both bounds
  // itself rather than trusting its one well-behaved caller: `pushRefusal`
  // decides, locally and with no network, and nothing runs until it says so.
  ipcMain.handle("push:execute", (_e, dir: string, preview: PushPreview): PushResult => {
    const refusal = pushRefusal(dir, preview);
    if (refusal !== null) {
      // The refused target stays OFF the screen — those strings came from
      // outside this process — but it is not lost. It goes where the app
      // already tells owners its technical details go: the log file.
      logError("push:execute", new Error(`refused push target: remote=${JSON.stringify(preview?.remote)} branch=${JSON.stringify(preview?.branch)} head=${JSON.stringify(preview?.head)}`));
      return refusal;
    }
    return pushExecute(dir, preview);
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
      const result = conductorService.connect(request);
      emitBridgeSync(); // failed verified writes can also change recovery status
      return result;
    } catch (err) {
      logError("conductor:connect", err);
      return { ok: false, message: plainMessage(err) };
    }
  });

  ipcMain.handle("conductor:renewConsent", (_e, request: ConductorRenewConsentRequest): Result<null> => {
    try {
      const result = conductorService.renewConsent(request);
      emitBridgeSync();
      return result;
    } catch (err) {
      logError("conductor:renewConsent", err);
      return { ok: false, message: plainMessage(err) };
    }
  });

  ipcMain.handle("conductor:oauthBegin", (event, request: ConductorOAuthRequest): Promise<Result<{ authUrl: string }>> => {
    try {
      return conductorService.beginOAuth(request, (oauthEvent: ConductorOAuthEvent) => {
        emitBridgeSync(); // terminal failures can be indeterminate and require recovery
        if (!event.sender.isDestroyed()) event.sender.send("conductor:oauth", oauthEvent);
      });
    } catch (err) {
      logError("conductor:oauthBegin", err);
      return Promise.resolve({ ok: false, message: plainMessage(err) });
    }
  });

  ipcMain.handle("conductor:oauthCancel", () =>
    toResult("conductor:oauthCancel", () => {
      conductorService.cancelOAuth();
      return null;
    }));

  ipcMain.handle("conductor:disconnect", (_e, request?: unknown): Result<null> => {
    let result: Result<null>;
    try {
      result = conductorService.disconnect(request);
    } catch (err) {
      logError("conductor:disconnect", err);
      result = { ok: false, message: plainMessage(err) };
    }
    // A failed Forget may already have crossed the credential-deletion
    // boundary. Phones must refresh into recovery just as the desktop does.
    emitBridgeSync();
    return result;
  });

  ipcMain.handle("conductor:setModel", (_e, model: string) =>
    toResult("conductor:setModel", () => {
      conductorService.setModel(model);
      emitBridgeSync();
      return null;
    }));

  ipcMain.handle("conductor:send", (event, request: ConductorSendRequest): Result<{ conversationId: string }> => {
    try {
      return conductorService.send(request, (delta: ConductorDelta) => {
        event.sender.send("conductor:delta", delta);
        emitBridgeSync(); // the same delta is what a watching phone refreshes on
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

  ipcMain.handle("conductor:current", (_e, dir: string) => conductorService.current(dir));

  ipcMain.handle("conductor:conversations", (_e, dir: string) => conductorService.conversations(dir));

  ipcMain.handle("conductor:turns", (_e, dir: string, id: string) => conductorService.turns(dir, id));

  ipcMain.handle("conductor:proposal", (_e, dir: string, id: string) => conductorService.proposal(dir, id));

  ipcMain.handle("conductor:action", (_e, dir: string, id: string) => conductorService.action(dir, id));
}

/** Task 143: the desktop's side of the phone bridge — the settings surface
 * asks for state and pairing codes here; the phone itself never touches
 * IPC (it talks to the bridge's HTTP listener, which calls the same
 * service functions above). */
export function registerBridgeIpc(): void {
  ipcMain.handle("bridge:state", () => phoneBridgeState());

  ipcMain.handle("bridge:pairBegin", () => {
    try {
      return phoneBridgePairBegin();
    } catch (err) {
      logError("bridge:pairBegin", err);
      return { ok: false, message: plainMessage(err) };
    }
  });

  ipcMain.handle("bridge:revokeDevice", (_e, id: string) =>
    toResult("bridge:revokeDevice", () => {
      const result = phoneBridgeRevokeDevice(id);
      if (!result.ok) throw new Error(result.message);
      return null;
    }));
}
