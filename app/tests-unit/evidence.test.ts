import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  discardUnfinalizedEvidenceRun,
  evidenceRunRecordPath,
  finalizeEvidenceRun,
  readEvidenceAlbum,
  readEvidenceImage,
  recordEvidenceCapture,
  setEvidenceMarkerDir,
} from "../src/main/evidence.js";

function png(width = 1320, height = 820, fill = 0): Buffer {
  const value = Buffer.alloc(32, fill);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(value, 0);
  value.writeUInt32BE(13, 8);
  value.write("IHDR", 12, "ascii");
  value.writeUInt32BE(width, 16);
  value.writeUInt32BE(height, 20);
  return value;
}

function fixture(): { root: string; profile: string; cleanup(): void } {
  const base = mkdtempSync(join(tmpdir(), "cairn-evidence-unit-"));
  const root = join(base, "project");
  const profile = join(base, "profile");
  mkdirSync(root, { recursive: true });
  mkdirSync(profile, { recursive: true });
  setEvidenceMarkerDir(profile);
  return {
    root,
    profile,
    cleanup() {
      setEvidenceMarkerDir(null);
      rmSync(base, { recursive: true, force: true });
    },
  };
}

test("a main-owned before and terminal capture become one trusted run-bound pair outside the project", () => {
  const fx = fixture();
  try {
    const runId = "11111111-1111-4111-8111-111111111111";
    const before = recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:00:00.000Z",
    });
    const after = recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(1320, 820, 1),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:01:00.000Z",
    });
    finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 173,
      title: "Show the evidence",
      disposition: "DONE",
      completedAt: "2026-08-03T20:01:01.000Z",
    });

    const album = readEvidenceAlbum(fx.root, runId);
    assert.equal(album.entries.length, 1);
    assert.equal(album.entries[0]?.trusted, true);
    assert.equal(album.entries[0]?.taskNumber, 173);
    assert.deepEqual(album.entries[0]?.images.map((item) => item.role), ["before", "after"]);
    assert.equal(album.entries[0]?.pair?.beforeId, before.id);
    assert.equal(album.entries[0]?.pair?.afterId, after.id);
    assert.ok(!JSON.stringify(album).includes(fx.root), "renderer metadata carries no project or profile path");
    assert.equal(existsSync(join(fx.root, ".cairn", "evidence")), false);
    assert.ok(evidenceRunRecordPath(fx.root, runId).startsWith(fx.profile));

    const image = readEvidenceImage(fx.root, before.id);
    assert.equal(image?.id, before.id);
    assert.match(image?.dataUrl ?? "", /^data:image\/png;base64,/);
  } finally {
    fx.cleanup();
  }
});

test("the same run boundary is captured once and cannot be replaced by a retry", () => {
  const fx = fixture();
  try {
    const runId = "22222222-2222-4222-8222-222222222222";
    const input = {
      root: fx.root,
      runId,
      boundary: "worker-not-started" as const,
      png: png(),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:00:00.000Z",
    };
    const first = recordEvidenceCapture(input);
    const second = recordEvidenceCapture({ ...input, png: png(760, 620, 7), width: 760, height: 620 });
    assert.deepEqual(second, first);
    const files = readdirSync(dirname(evidenceRunRecordPath(fx.root, runId)));
    assert.equal(files.filter((name) => name.endsWith(".png")).length, 1);
  } finally {
    fx.cleanup();
  }
});

test("a worker-written legacy manifest is browseable history but never a trusted card pair", () => {
  const fx = fixture();
  try {
    const shots = join(fx.root, "app", "shots");
    mkdirSync(shots, { recursive: true });
    writeFileSync(join(shots, "worker-before.png"), png());
    writeFileSync(join(shots, "worker-after.png"), png(1320, 820, 2));
    writeFileSync(join(shots, "manifest.json"), JSON.stringify({
      entries: [{
        task: 173,
        runId: "33333333-3333-4333-8333-333333333333",
        title: "Worker says this is evidence",
        caption: "Untrusted local history",
        shots: [
          { file: "worker-before.png", label: "Before" },
          { file: "worker-after.png", label: "After" },
        ],
      }],
    }));

    const album = readEvidenceAlbum(fx.root, "33333333-3333-4333-8333-333333333333");
    assert.equal(album.entries.length, 1);
    assert.equal(album.entries[0]?.trusted, false);
    assert.equal(album.entries[0]?.runId, null);
    assert.equal(album.entries[0]?.pair, null);
    assert.match(album.entries[0]?.images[0]?.label ?? "", /^Past review shot/);
  } finally {
    fx.cleanup();
  }
});

test("replacement after attestation disappears fail-closed without affecting another run", () => {
  const fx = fixture();
  try {
    const firstRun = "44444444-4444-4444-8444-444444444444";
    const capture = recordEvidenceCapture({
      root: fx.root,
      runId: firstRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:00:00.000Z",
    });
    finalizeEvidenceRun(fx.root, firstRun, {
      taskNumber: 173,
      title: "First run",
      disposition: "STOPPED",
      completedAt: "2026-08-03T20:00:30.000Z",
    });
    const record = JSON.parse(readFileSync(evidenceRunRecordPath(fx.root, firstRun), "utf8")) as {
      captures: Array<{ id: string; file: string }>;
    };
    const file = record.captures[0]?.file;
    assert.ok(file);
    writeFileSync(join(dirname(evidenceRunRecordPath(fx.root, firstRun)), file), png(1320, 820, 9));
    assert.equal(readEvidenceImage(fx.root, capture.id), null);

    const secondRun = "55555555-5555-4555-8555-555555555555";
    recordEvidenceCapture({
      root: fx.root,
      runId: secondRun,
      boundary: "done",
      png: png(760, 620, 4),
      width: 760,
      height: 620,
    });
    finalizeEvidenceRun(fx.root, secondRun, {
      taskNumber: 174,
      title: "Second run",
      disposition: "DONE",
    });
    const album = readEvidenceAlbum(fx.root, secondRun);
    assert.deepEqual(album.entries.map((entry) => entry.taskNumber), [174]);
    assert.equal(album.entries[0]?.images.length, 1, "one surviving image remains honest evidence");
    assert.equal(album.entries[0]?.images[0]?.role, "after");
    assert.equal(album.entries[0]?.pair, null);
    assert.match(album.entries[0]?.caption ?? "", /no pre-work picture survived/i);
    assert.doesNotMatch(album.entries[0]?.caption ?? "", /before the worker started and after/);
  } finally {
    fx.cleanup();
  }
});

test("a corrupt run record is preserved, refuses mutation, and does not poison other runs", () => {
  const fx = fixture();
  try {
    const corruptRun = "66666666-6666-4666-8666-666666666666";
    const record = evidenceRunRecordPath(fx.root, corruptRun);
    mkdirSync(dirname(record), { recursive: true });
    writeFileSync(record, "{not-json", "utf8");
    assert.throws(() => recordEvidenceCapture({
      root: fx.root,
      runId: corruptRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    }), /EVIDENCE_RECORD_INVALID/);
    assert.equal(readFileSync(record, "utf8"), "{not-json");

    const healthyRun = "77777777-7777-4777-8777-777777777777";
    recordEvidenceCapture({
      root: fx.root,
      runId: healthyRun,
      boundary: "error",
      png: png(),
      width: 1320,
      height: 820,
    });
    finalizeEvidenceRun(fx.root, healthyRun, {
      taskNumber: null,
      title: "Run ended before a task number was assigned",
      disposition: "ERROR",
    });
    const album = readEvidenceAlbum(fx.root, healthyRun);
    assert.equal(album.entries.length, 1);
    assert.equal(album.entries[0]?.disposition, "ERROR");
    assert.equal(album.entries[0]?.taskNumber, null);
  } finally {
    fx.cleanup();
  }
});

test("a trusted image id cannot be replayed into another project", () => {
  const fx = fixture();
  try {
    const runId = "88888888-8888-4888-8888-888888888888";
    const capture = recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(),
      width: 1320,
      height: 820,
    });
    const other = join(dirname(fx.root), "other-project");
    mkdirSync(other, { recursive: true });
    assert.equal(readEvidenceImage(other, capture.id), null);
    assert.deepEqual(readEvidenceAlbum(other, runId).entries, []);
  } finally {
    fx.cleanup();
  }
});

test("custody refuses a profile inside the selected project before creating evidence", () => {
  const base = mkdtempSync(join(tmpdir(), "cairn-evidence-overlap-"));
  const root = join(base, "project");
  const nestedProfile = join(root, "profile");
  mkdirSync(nestedProfile, { recursive: true });
  setEvidenceMarkerDir(nestedProfile);
  try {
    assert.throws(() => recordEvidenceCapture({
      root,
      runId: "99999999-9999-4999-8999-999999999999",
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    }), /EVIDENCE_STORE_OVERLAPS_PROJECT/);
    assert.equal(existsSync(join(nestedProfile, "evidence")), false);
  } finally {
    setEvidenceMarkerDir(null);
    rmSync(base, { recursive: true, force: true });
  }
});

test("custody also refuses a selected project inside the app profile", () => {
  const base = mkdtempSync(join(tmpdir(), "cairn-evidence-reverse-overlap-"));
  const profile = join(base, "profile");
  const nestedProject = join(profile, "project");
  mkdirSync(nestedProject, { recursive: true });
  setEvidenceMarkerDir(profile);
  try {
    assert.throws(() => recordEvidenceCapture({
      root: nestedProject,
      runId: "99999999-9999-4999-8999-999999999998",
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    }), /EVIDENCE_STORE_OVERLAPS_PROJECT/);
    assert.equal(existsSync(join(profile, "evidence")), false);
  } finally {
    setEvidenceMarkerDir(null);
    rmSync(base, { recursive: true, force: true });
  }
});

test("terminal truth is exclusive, matches disposition, and an unfinalized readiness picture can be discarded", () => {
  const fx = fixture();
  try {
    const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(1320, 820, 2),
      width: 1320,
      height: 820,
    });
    assert.throws(() => recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "stopped",
      png: png(1320, 820, 3),
      width: 1320,
      height: 820,
    }), /EVIDENCE_TERMINAL_CONFLICT/);
    assert.throws(() => finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 173,
      title: "Contradictory close",
      disposition: "STOPPED",
    }), /EVIDENCE_DISPOSITION_MISMATCH/);

    const disposable = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    recordEvidenceCapture({
      root: fx.root,
      runId: disposable,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const disposablePath = dirname(evidenceRunRecordPath(fx.root, disposable));
    discardUnfinalizedEvidenceRun(fx.root, disposable);
    assert.equal(existsSync(disposablePath), false);
  } finally {
    fx.cleanup();
  }
});

test("the selected run cannot be crowded out and sparse trusted history pages without duplication", () => {
  const fx = fixture();
  try {
    const runIds: string[] = [];
    for (let index = 0; index < 42; index += 1) {
      const runId = `cccccccc-cccc-4ccc-8ccc-${String(index + 1).padStart(12, "0")}`;
      runIds.push(runId);
      recordEvidenceCapture({
        root: fx.root,
        runId,
        boundary: "done",
        png: png(32, 24, index),
        width: 32,
        height: 24,
      });
      finalizeEvidenceRun(fx.root, runId, {
        taskNumber: index + 1,
        title: `Run ${index + 1}`,
        disposition: "DONE",
        completedAt: new Date(Date.UTC(2023, index, 1, 12)).toISOString(),
      });
    }

    const selectedRunId = runIds.at(-1) ?? null;
    const first = readEvidenceAlbum(fx.root, selectedRunId);
    assert.equal(first.entries[0]?.runId, selectedRunId);
    assert.ok(first.nextCursor);
    const pages = [first];
    let cursor: string | null = first.nextCursor;
    while (cursor !== null) {
      const page = readEvidenceAlbum(fx.root, selectedRunId, cursor);
      assert.ok(page.entries.length <= 40);
      pages.push(page);
      cursor = page.nextCursor;
      assert.ok(pages.length < 10, "a cursor must make progress through sparse dates");
    }
    const all = pages.flatMap((page) => page.entries).map((entry) => entry.runId);
    assert.equal(new Set(all).size, 42);
    assert.equal(all.length, 42);
  } finally {
    fx.cleanup();
  }
});

test("a corrupt selected run cannot suppress unrelated checked history", () => {
  const fx = fixture();
  try {
    const healthyRun = "34343434-3434-4343-8343-343434343434";
    recordEvidenceCapture({
      root: fx.root,
      runId: healthyRun,
      boundary: "done",
      png: png(32, 24, 3),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, healthyRun, {
      taskNumber: 172,
      title: "Healthy earlier run",
      disposition: "DONE",
      completedAt: "2026-07-01T12:00:00.000Z",
    });

    const corruptRun = "56565656-5656-4565-8565-565656565656";
    recordEvidenceCapture({
      root: fx.root,
      runId: corruptRun,
      boundary: "done",
      png: png(32, 24, 5),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, corruptRun, {
      taskNumber: 173,
      title: "Corrupt selected run",
      disposition: "DONE",
      completedAt: "2026-08-01T12:00:00.000Z",
    });
    const path = evidenceRunRecordPath(fx.root, corruptRun);
    const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    record.disposition = "STOPPED";
    writeFileSync(path, `${JSON.stringify(record)}\n`, "utf8");

    const album = readEvidenceAlbum(fx.root, corruptRun);
    assert.deepEqual(album.entries.map((entry) => entry.runId), [healthyRun]);
    assert.equal(album.entries[0]?.trusted, true);
  } finally {
    fx.cleanup();
  }
});

test("a trusted-history byte stop retries the current run instead of skipping its valid sibling", () => {
  const fx = fixture();
  try {
    const olderRun = "71717171-7171-4717-8717-717171717171";
    recordEvidenceCapture({
      root: fx.root,
      runId: olderRun,
      boundary: "done",
      png: png(32, 24, 1),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, olderRun, {
      taskNumber: 171,
      title: "Older intact run",
      disposition: "DONE",
      completedAt: "2026-01-01T12:00:00.000Z",
    });

    const targetRun = "72727272-7272-4727-8727-727272727272";
    const changed = recordEvidenceCapture({
      root: fx.root,
      runId: targetRun,
      boundary: "worker-not-started",
      png: png(32, 24, 2),
      width: 32,
      height: 24,
    });
    recordEvidenceCapture({
      root: fx.root,
      runId: targetRun,
      boundary: "done",
      png: png(32, 24, 3),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, targetRun, {
      taskNumber: 172,
      title: "One changed picture, one intact picture",
      disposition: "DONE",
      completedAt: "2026-01-02T12:00:00.000Z",
    });
    const changedId = changed.id.split(".").at(-1);
    assert.ok(changedId);
    truncateSync(join(dirname(evidenceRunRecordPath(fx.root, targetRun)), `${changedId}.png`), 16 * 1024 * 1024);

    for (let index = 0; index < 8; index += 1) {
      const runId = `73737373-7373-4737-8737-${String(index + 1).padStart(12, "0")}`;
      const capture = recordEvidenceCapture({
        root: fx.root,
        runId,
        boundary: "done",
        png: png(32, 24, index + 4),
        width: 32,
        height: 24,
      });
      finalizeEvidenceRun(fx.root, runId, {
        taskNumber: 180 + index,
        title: `Changed newer run ${index + 1}`,
        disposition: "DONE",
        completedAt: new Date(Date.UTC(2026, 1, index + 1, 12)).toISOString(),
      });
      const captureId = capture.id.split(".").at(-1);
      assert.ok(captureId);
      truncateSync(join(dirname(evidenceRunRecordPath(fx.root, runId)), `${captureId}.png`), 15 * 1024 * 1024);
    }

    const first = readEvidenceAlbum(fx.root, null);
    assert.deepEqual(first.entries, []);
    assert.ok(first.nextCursor, "the bounded page must resume at the unattempted target run");
    const second = readEvidenceAlbum(fx.root, null, first.nextCursor);
    assert.deepEqual(second.entries.map((entry) => entry.runId), [targetRun, olderRun]);
    assert.deepEqual(second.entries[0]?.images.map((image) => image.role), ["after"]);
  } finally {
    fx.cleanup();
  }
});

test("the selected run is direct-loaded even when its history marker is unavailable", () => {
  const fx = fixture();
  try {
    const runId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(),
      width: 1320,
      height: 820,
    });
    finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 173,
      title: "Direct card lookup",
      disposition: "DONE",
    });
    const projectEvidence = dirname(dirname(evidenceRunRecordPath(fx.root, runId)));
    rmSync(join(projectEvidence, "_timeline"), { recursive: true, force: true });
    const album = readEvidenceAlbum(fx.root, runId);
    assert.equal(album.entries[0]?.runId, runId);
    assert.equal(album.entries[0]?.trusted, true);
  } finally {
    fx.cleanup();
  }
});

test("persisted terminal contradictions, forged labels, and case-variant capture ids fail closed", () => {
  const fx = fixture();
  try {
    const contradictoryRun = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const contradictoryImage = recordEvidenceCapture({
      root: fx.root,
      runId: contradictoryRun,
      boundary: "done",
      png: png(),
      width: 1320,
      height: 820,
    });
    finalizeEvidenceRun(fx.root, contradictoryRun, {
      taskNumber: 173,
      title: "Persisted contradiction",
      disposition: "DONE",
    });
    const contradictoryPath = evidenceRunRecordPath(fx.root, contradictoryRun);
    const contradictory = JSON.parse(readFileSync(contradictoryPath, "utf8")) as Record<string, unknown>;
    contradictory.disposition = "STOPPED";
    writeFileSync(contradictoryPath, `${JSON.stringify(contradictory)}\n`, "utf8");
    assert.equal(readEvidenceImage(fx.root, contradictoryImage.id), null);
    assert.deepEqual(readEvidenceAlbum(fx.root, contradictoryRun).entries, []);

    const labelRun = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const labelImage = recordEvidenceCapture({
      root: fx.root,
      runId: labelRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const labelPath = evidenceRunRecordPath(fx.root, labelRun);
    const forgedLabel = JSON.parse(readFileSync(labelPath, "utf8")) as { captures: Array<Record<string, unknown>> };
    forgedLabel.captures[0]!.label = "Worker says this is checked.";
    writeFileSync(labelPath, `${JSON.stringify(forgedLabel)}\n`, "utf8");
    assert.equal(readEvidenceImage(fx.root, labelImage.id), null);

    const duplicateRun = "12121212-1212-4212-8212-121212121212";
    recordEvidenceCapture({
      root: fx.root,
      runId: duplicateRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const duplicatePath = evidenceRunRecordPath(fx.root, duplicateRun);
    const duplicate = JSON.parse(readFileSync(duplicatePath, "utf8")) as { captures: Array<Record<string, unknown>> };
    const first = duplicate.captures[0]!;
    duplicate.captures.push({
      ...first,
      id: String(first.id).toUpperCase(),
      boundary: "done",
      label: "After \u2014 Cairn verified the run as DONE.",
    });
    writeFileSync(duplicatePath, `${JSON.stringify(duplicate)}\n`, "utf8");
    assert.throws(() => finalizeEvidenceRun(fx.root, duplicateRun, {
      taskNumber: 173,
      title: "Duplicate identity",
      disposition: "DONE",
    }), /EVIDENCE_RECORD_INVALID/);
  } finally {
    fx.cleanup();
  }
});

test("malformed legacy images spend the aggregate declared-byte budget before header reads", () => {
  const fx = fixture();
  try {
    const shots = join(fx.root, "app", "shots");
    mkdirSync(shots, { recursive: true });
    const rows: Array<{ file: string; label: string }> = [];
    for (let index = 0; index < 5; index += 1) {
      const file = `large-invalid-${index}.png`;
      const absolute = join(shots, file);
      writeFileSync(absolute, Buffer.alloc(0));
      truncateSync(absolute, 16 * 1024 * 1024);
      rows.push({ file, label: `Invalid ${index}` });
    }
    writeFileSync(join(shots, "would-leak-through.png"), png(1, 1));
    rows.push({ file: "would-leak-through.png", label: "Must stay beyond the budget" });
    writeFileSync(join(shots, "manifest.json"), JSON.stringify({
      entries: [{ task: 173, title: "Budget", caption: "Bounded", shots: rows }],
    }));
    assert.deepEqual(readEvidenceAlbum(fx.root, null).entries, [],
      "an invalid large prefix cannot make the reader reach a later valid image past 64 MiB");
  } finally {
    fx.cleanup();
  }
});

test("descriptor reads stay capped to the size checked before allocation", () => {
  const source = readFileSync(join(__dirname, "..", "..", "src", "main", "evidence.ts"), "utf8");
  assert.match(source, /readDescriptorBytes\(descriptor: number, size: number\)/);
  assert.match(source, /readSync\(descriptor, bytes, offset, size - offset, offset\)/);
  assert.doesNotMatch(source, /readFileSync\(descriptor\)/);
});
