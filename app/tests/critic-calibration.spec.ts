import { _electron as electron, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { test } from "./fixtures/isolated-profile";

const FIXTURES = Object.freeze({
  C01: { fixtureSha256: "ec91e14fcb8ba56631075d7926c5451c48eb63359cb9b3133a45aca0ef945dcc" },
  C02: { fixtureSha256: "b5615be97bdbbe98d1777bd1d26120a096abc2f0cb974d76abca0f4408ff1471" },
  C03: {
    fixtureSha256: "710fab01cc243f4ad13c494fac5edf0f0a5be5aaf9972edae8f8aeb1dab710ea",
    requestBodySha256: "c4f7ca0ba1c762080f02804dc92f98ea1035dfefdec53338cad83c12466c9315",
  },
  C04: {
    fixtureSha256: "dc6517336301e78e5fc980873803e3cce3256e04b17568a2612483184eb85cea",
    packetSha256: "e09494494dd21766fe427fe36c82832f0cb071facbffe90f211a0972e7deee64",
    requestSha256: "7425e5219298d115e7e803d7beea0623ec5c6cecc2b7d610c52642d8034671d9",
    requestBodySha256: "f7e6594420b6e6a9ae848f1c34dcdea671580acc0c09863881a64562c39a7bd4",
  },
  C05: { fixtureSha256: "3b9cae049cc158f65d20b1daf2c1b9adeafdc3f480c0d1711f93da7c788d7463" },
} as const);

const MANIFEST_SHA256 = "e5d321c74506bf70ded87baf9492c6bcae68de1781fbc35a1d0da7aad4bffda8";

type FakeReceipt = Readonly<{
  invocationCount: number;
  requests: readonly Readonly<{ url: string; body: string }>[];
}>;

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Calibration", what: "w", who: "me", milestone: "see it" });`,
    project,
  ]);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

test("guarded synthetic critic covers approve, decline, stale, cancellation, restart, and exact packet boundary", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-e2e-"));
  const profile = process.env.CAIRN_TEST_USER_DATA;
  if (!profile) throw new Error("isolated profile missing");
  scaffold(project);
  const statePath = join(profile, "critic-calibration", "state.json");
  const markerPath = join(profile, "critic-calibration-e2e-request.json");
  const receipt = (): FakeReceipt => JSON.parse(readFileSync(markerPath, "utf8")) as FakeReceipt;
  const latestRequest = (): Readonly<{ url: string; body: string }> => {
    const value = receipt();
    const request = value.requests[value.requests.length - 1];
    if (request === undefined) throw new Error("synthetic fake receipt has no request");
    return request;
  };
  const records = (): Array<Record<string, unknown>> => {
    if (!existsSync(statePath)) return [];
    const envelope = JSON.parse(readFileSync(statePath, "utf8")) as { body: { records: Array<Record<string, unknown>> } };
    return envelope.body.records;
  };
  const launch = (mode: "respond" | "hold" = "respond") => electron.launch({
    args: ["."],
    env: {
      ...process.env,
      CAIRN_MOCK: "1",
      CAIRN_OPEN: project,
      CAIRN_TEST_CRITIC_CALIBRATION: "1",
      CAIRN_TEST_CRITIC_CALIBRATION_MODE: mode,
    },
  });

  let app = await launch();
  try {
    let win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });

    // Open through a differently-spelled alias. The card is restored through
    // the screen's ordinary project spelling, proving Main uses one canonical
    // key for approval and snapshot lookup.
    const alias = `${project}${sep}.`;
    const opened = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C04", fixtureSha256: hash,
    }), { dir: alias, hash: FIXTURES.C04.fixtureSha256 });
    expect(opened.ok).toBe(true);
    if (!opened.ok) throw new Error(opened.message);
    const call = opened.value.disclosure;
    const card = () => win.getByRole("region", { name: "Independent critic call" });
    await expect(card()).toBeVisible();
    await expect(card()).toContainText("synthetic calibration C04, fixture 4 of 12");
    await expect(card()).toContainText(MANIFEST_SHA256);
    await expect(card()).toContainText(FIXTURES.C04.fixtureSha256);
    await expect(card()).toContainText(FIXTURES.C04.packetSha256);
    await expect(card()).toContainText(FIXTURES.C04.requestSha256);
    await expect(card()).toContainText(FIXTURES.C04.requestBodySha256);
    await expect(card()).toContainText("project files or project content");
    await expect(card()).toContainText("No saved provider key is used");
    await expect(card()).toContainText(`${call.selectedFiles} of at most ${call.fileCap}`);
    await card().getByText("Inspect the exact synthetic text").click();
    await expect(card()).toContainText("The c1 collector returned NO_CAPTURE; the SP1 probe produced a record.");
    expect(existsSync(markerPath)).toBe(false);

    // An altered echo is refused and leaves the genuine card waiting.
    const mismatch = await win.evaluate(({ dir, disclosure }) => window.cairn.criticCallDecide({
      dir,
      approvalId: disclosure.approvalId,
      action: "approve",
      disclosure: { ...disclosure, billingBasis: `${disclosure.billingBasis} altered` },
    }), { dir: project, disclosure: call });
    expect(mismatch.ok).toBe(false);
    await expect(card()).toBeVisible();
    expect(existsSync(markerPath)).toBe(false);

    await card().getByRole("button", { name: "Approve this critic call" }).click();
    await expect(card()).toHaveCount(0);
    await expect.poll(() => records().find((row) => row.fixtureId === "C04")?.status).toBe("unavailable");
    const firstReceipt = receipt();
    expect(Object.keys(firstReceipt).sort()).toEqual(["invocationCount", "requests"]);
    expect(firstReceipt.invocationCount).toBe(1);
    expect(firstReceipt.requests).toHaveLength(1);
    const marker = latestRequest();
    expect(marker.url).toBe("https://critic-calibration.invalid/v1/chat/completions");
    expect(sha256(marker.body)).toBe(FIXTURES.C04.requestBodySha256);
    const wire = JSON.parse(marker.body) as {
      model: string; temperature: number; top_p: number; max_tokens: number; stream: boolean;
      messages: Array<{ role: string; content: string }>;
    };
    expect(Object.keys(wire).sort()).toEqual(["max_tokens", "messages", "model", "stream", "temperature", "top_p"]);
    expect(wire).toMatchObject({
      model: "cairn/synthetic-critic-v1", temperature: 0, top_p: 1, max_tokens: 8_192, stream: false,
    });
    expect(wire.messages.map((message) => message.role)).toEqual(["system", "user"]);
    const parsedWireText = wire.messages.map((message) => message.content).join("\n");
    expect(parsedWireText).not.toContain(project);
    expect(parsedWireText).not.toContain(profile);
    expect(marker.body).not.toMatch(/(?:file|https?):\/\//u);
    expect(marker.body).not.toMatch(/(?:^|["/\\])\.(?:git|cairn)(?:["/\\]|$)/u);
    expect("tools" in wire || "tool_choice" in wire || "functions" in wire || "stream_options" in wire).toBe(false);
    expect(records().find((row) => row.fixtureId === "C04")).toMatchObject({
      status: "unavailable",
      code: "CRITIC_CALIBRATION_OUTPUT_INVALID",
      sent: true,
      providerStatus: null,
      requestBodySha256: FIXTURES.C04.requestBodySha256,
      rawOutput: "{}",
      providerReportedModel: "cairn/synthetic-critic-v1",
      finishReason: "stop",
      requestId: "cairn-e2e-synthetic-request",
      usage: { promptTokens: 0, completionTokens: 0, costUsd: 0 },
    });
    expect((records().find((row) => row.fixtureId === "C04")?.custody as Record<string, unknown>)?.requestSha256)
      .toBe(FIXTURES.C04.requestSha256);

    const stale = await win.evaluate(({ dir, disclosure }) => window.cairn.criticCallDecide({
      dir, approvalId: disclosure.approvalId, action: "approve", disclosure,
    }), { dir: project, disclosure: call });
    expect(stale.ok).toBe(false);
    expect(receipt().invocationCount, "a stale approval cannot make an identical second send").toBe(1);
    expect(sha256(latestRequest().body)).toBe(FIXTURES.C04.requestBodySha256);

    // A completed call survives restart and cannot be replayed.
    await app.close();
    app = await launch();
    win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
    expect(await win.evaluate((dir) => window.cairn.criticCalibrationCurrent(dir), project)).toBeNull();
    const replay = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C04", fixtureSha256: hash,
    }), { dir: project, hash: FIXTURES.C04.fixtureSha256 });
    expect(replay.ok).toBe(false);

    // Decline and pre-send cancellation both retire the exact card without
    // reaching the fake or changing its one prior request receipt.
    const declinedOpen = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C01", fixtureSha256: hash,
    }), { dir: project, hash: FIXTURES.C01.fixtureSha256 });
    expect(declinedOpen.ok).toBe(true);
    await expect(card()).toBeVisible();
    await card().getByRole("button", { name: "Stop this task" }).click();
    await expect(card()).toHaveCount(0);
    expect(records().find((row) => row.fixtureId === "C01")?.status).toBe("declined");
    expect(receipt().invocationCount).toBe(1);
    expect(sha256(latestRequest().body)).toBe(FIXTURES.C04.requestBodySha256);

    const cancelledOpen = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C02", fixtureSha256: hash,
    }), { dir: project, hash: FIXTURES.C02.fixtureSha256 });
    expect(cancelledOpen.ok).toBe(true);
    await expect(card()).toBeVisible();
    expect(await win.evaluate((dir) => window.cairn.criticCalibrationCancel(dir), project)).toEqual({ ok: true, value: "cancelled" });
    await expect(card()).toHaveCount(0);
    expect(records().find((row) => row.fixtureId === "C02")?.status).toBe("cancelled");
    expect(receipt().invocationCount).toBe(1);
    expect(sha256(latestRequest().body)).toBe(FIXTURES.C04.requestBodySha256);

    // Hold the injected fake after it receives the exact bytes.
    await app.close();
    app = await launch("hold");
    win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
    const heldOpen = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C03", fixtureSha256: hash,
    }), { dir: project, hash: FIXTURES.C03.fixtureSha256 });
    expect(heldOpen.ok).toBe(true);
    await expect(card()).toBeVisible();
    await card().getByRole("button", { name: "Approve this critic call" }).click();
    await expect.poll(() => existsSync(markerPath)
      ? sha256(latestRequest().body)
      : null).toBe(FIXTURES.C03.requestBodySha256);
    expect(receipt().invocationCount).toBe(2);

    // Ordinary app close aborts and drains an approved in-flight fake before
    // Electron exits. Restart sees one honest terminal record and no retry.
    await app.close();
    app = await launch();
    win = await app.firstWindow();
    await win.waitForLoadState("domcontentloaded");
    await expect.poll(() => records().find((row) => row.fixtureId === "C03")?.status).toBe("unavailable");
    expect(records().find((row) => row.fixtureId === "C03")).toMatchObject({ code: "CRITIC_CALL_CANCELLED", sent: true });
    expect(receipt().invocationCount, "graceful quit and restart must not retry an approved fixture").toBe(2);
    await expect(card()).toHaveCount(0);

    // A card waiting only in memory does not reappear or send on restart.
    await app.close();
    app = await launch();
    win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
    const pendingOpen = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C05", fixtureSha256: hash,
    }), { dir: project, hash: FIXTURES.C05.fixtureSha256 });
    expect(pendingOpen.ok).toBe(true);
    await expect(card()).toBeVisible();
    const beforeRestartReceipt = receipt();
    await app.close();
    app = await launch();
    win = await app.firstWindow();
    await expect(win.getByRole("button", { name: "← Project home" })).toBeVisible({ timeout: 30_000 });
    expect(await win.evaluate((dir) => window.cairn.criticCalibrationCurrent(dir), project)).toBeNull();
    expect(records().some((row) => row.fixtureId === "C05")).toBe(false);
    expect(receipt()).toEqual(beforeRestartReceipt);

    const reopened = await win.evaluate(({ dir, hash }) => window.cairn.criticCalibrationOpen({
      dir, fixtureId: "C05", fixtureSha256: hash,
    }), { dir: project, hash: FIXTURES.C05.fixtureSha256 });
    expect(reopened.ok, "restart may reopen an unsent fixture, but never sends it automatically").toBe(true);
    expect(await win.evaluate((dir) => window.cairn.criticCalibrationCancel(dir), project)).toEqual({ ok: true, value: "cancelled" });
    expect(records().find((row) => row.fixtureId === "C05")?.status).toBe("cancelled");
  } finally {
    await app.close().catch(() => undefined);
    rmSync(project, { recursive: true, force: true });
  }
});
