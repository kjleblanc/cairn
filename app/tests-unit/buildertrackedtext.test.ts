import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import { builderTurnContextSha256 } from "@cairn/core";
import {
  TASK232_FAKE_BUILDER_AFTER_TEXT,
  consumeTask232FakeBuilderAnswer,
  createTask232FakeBuilderTransport,
  sendTask232FakeBuilderTurn,
  task232FakeBuilderAnswerMatches,
} from "../src/main/builderfaketransport.js";
import { task232FixedTrackedTextRequestForTests } from "../src/main/builderproposalreviewfixture.js";
import {
  appendTask232SyntheticBuilderReview,
  prepareTask232SyntheticBuilderReview,
} from "../src/main/builderreviewroutefixture.js";
import {
  builderTrackedTextSelectionMatchesContext,
  builderTrackedTextSelectionStillExact,
  captureBuilderTrackedTextSelection,
} from "../src/main/buildertrackedtext.js";
import {
  builderReviewMarkerSequence,
  setBuilderReviewMarkerDir,
} from "../src/main/conductor/builderreviewauth.js";
import { ensureCairnExcluded, readTurns } from "../src/main/conductor/store.js";
import { setCardMarkerDir } from "../src/main/conductor/cardauth.js";
import { setTurnMarkerDir } from "../src/main/conductor/turnauth.js";

const APP_ROOT = resolve(__dirname, "..", "..");
const TEST_RESULTS = resolve(APP_ROOT, "test-results");
const SELECTED_PATH = "examples/synthetic/greeting.ts";
const BEFORE = "export const greeting = '<script>syntheticBefore()</script>';\n";
const CHANGED = "export const greeting = 'changed while in custody';\n";

type OwnedDirectory = Readonly<{ path: string; real: string; dev: bigint; ino: bigint }>;
const owned: OwnedDirectory[] = [];

function own(prefix: string): OwnedDirectory {
  mkdirSync(TEST_RESULTS, { recursive: true });
  const parent = realpathSync.native(TEST_RESULTS);
  const path = mkdtempSync(join(parent, prefix));
  const real = realpathSync.native(path);
  const stat = lstatSync(real, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink() && stat.dev > 0n && stat.ino > 0n);
  const value = Object.freeze({ path, real, dev: stat.dev, ino: stat.ino });
  owned.push(value);
  return value;
}

after(() => {
  const parent = realpathSync.native(TEST_RESULTS);
  const failures: string[] = [];
  for (const entry of [...owned].reverse()) {
    if (!existsSync(entry.path)) continue;
    try {
      const real = realpathSync.native(entry.path);
      const stat = lstatSync(real, { bigint: true });
      const rel = relative(parent, real);
      if (real !== entry.real || stat.dev !== entry.dev || stat.ino !== entry.ino
        || !stat.isDirectory() || stat.isSymbolicLink() || rel === "" || rel === ".."
        || rel.startsWith(`..\\`) || rel.startsWith("../") || isAbsolute(rel)
        || !/^task232-/u.test(rel)) {
        failures.push(`${entry.path}: identity changed; retained`);
        continue;
      }
      rmSync(real, { recursive: true, force: false });
    } catch (error) {
      failures.push(`${entry.path}: ${error instanceof Error ? error.message : String(error)}; retained`);
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.fromEntries(Object.entries(process.env)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  for (const key of Object.keys(environment)) if (key.toUpperCase().startsWith("GIT_")) delete environment[key];
  const nullConfig = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = nullConfig;
  environment.GIT_CONFIG_GLOBAL = nullConfig;
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  return environment;
}

function git(root: string, args: readonly string[], input?: Buffer): string {
  const result = spawnSync("git", ["-c", "core.excludesFile=/dev/null", ...args], {
    cwd: root,
    env: gitEnvironment(),
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return (result.stdout ?? "").trimEnd();
}

function write(root: string, path: string, value: string | Buffer): void {
  const absolute = join(root, ...path.split("/"));
  mkdirSync(resolve(absolute, ".."), { recursive: true });
  writeFileSync(absolute, value);
}

function repository(
  label: string,
  files: Readonly<Record<string, string | Buffer>> = Object.freeze({ [SELECTED_PATH]: BEFORE }),
): OwnedDirectory {
  const root = own(`task232-${label}-project-`);
  git(root.path, ["init", "--initial-branch=main", "--object-format=sha1", "--ref-format=files"]);
  for (const [path, value] of Object.entries(files)) write(root.path, path, value);
  const paths = Object.keys(files).sort();
  git(root.path, ["add", "-f", "--", ...paths]);
  git(root.path, [
    "-c", "user.name=Cairn Task 232", "-c", "user.email=task232@example.invalid",
    "commit", "-m", `Seed ${label}`,
  ]);
  assert.equal(git(root.path, ["status", "--porcelain=v2", "--untracked-files=all"]), "");
  return root;
}

function profile(label: string): OwnedDirectory {
  const result = own(`task232-${label}-profile-`);
  setBuilderReviewMarkerDir(result.path);
  setTurnMarkerDir(result.path);
  setCardMarkerDir(result.path);
  return result;
}

function request(paths: readonly string[] = [SELECTED_PATH]): Record<string, unknown> {
  const fixed = task232FixedTrackedTextRequestForTests();
  return {
    taskNumber: fixed.taskNumber,
    runId: fixed.runId,
    turnId: fixed.turnId,
    connectionConsentVersion: fixed.connectionConsentVersion,
    taskSpec: fixed.taskSpec,
    evidencePlan: fixed.evidencePlan,
    selectedProjectRelativePaths: [...paths],
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

function noPersistence(projectRoot: string, profileRoot: string): void {
  assert.equal(existsSync(join(projectRoot, ".cairn", "conversations")), false);
  assert.equal(existsSync(join(profileRoot, "builder-review-markers")), false);
  assert.equal(existsSync(join(profileRoot, "conversation-event-markers")), false);
}

test("tracked-text selector derives one exact complete Task 224 context from a genuine Git file", () => {
  const project = repository("happy");
  const selection = captureBuilderTrackedTextSelection(project.path, request());
  assert.ok(selection);
  assert.equal(builderTrackedTextSelectionMatchesContext(selection, selection.context), true);
  assert.equal(builderTrackedTextSelectionStillExact(project.path, selection), true);
  assert.equal(builderTrackedTextSelectionStillExact(project.path, structuredClone(selection)), false);
  assert.equal(builderTrackedTextSelectionStillExact(project.path, new Proxy(selection, {})), false);
  const otherProject = repository("cross-project");
  assert.equal(builderTrackedTextSelectionStillExact(otherProject.path, selection), false);
  assert.equal(selection.context.baseHead, git(project.path, ["rev-parse", "HEAD"]));
  assert.match(selection.context.gitStateSha256, /^[a-f0-9]{64}$/u);
  assert.equal(selection.context.selectedTrackedText.length, 1);
  assert.deepEqual(selection.context.selectedTrackedText[0], {
    id: "tracked-text-1",
    projectRelativePath: SELECTED_PATH,
    sha256: sha256(BEFORE),
    content: BEFORE,
    truncated: false,
    provenance: {
      selectorVersion: "cairn-builder-context-selector/v1",
      projectHash: selection.context.projectHash,
      connectionConsentVersion: "selected-text-v1",
      gitTracked: true,
      ordinaryText: true,
      regularFile: true,
      symbolicLink: false,
      reparsePoint: false,
      hardLinkCount: 1,
      submodule: false,
      gitIgnored: false,
      dependency: false,
      packageOrDependencyControl: false,
      installScript: false,
      generated: false,
      deploymentOrProductionControl: false,
      credentialLikePath: false,
      credentialLikeContent: false,
      insideProject: true,
      reservedArea: false,
      consented: true,
    },
  });
  assertDeepFrozen(selection);
  assert.equal(readFileSync(join(project.path, ...SELECTED_PATH.split("/")), "utf8"), BEFORE);
  assert.equal(git(project.path, ["status", "--porcelain=v2", "--untracked-files=all"]), "");

  const modified = repository("current-worktree");
  write(modified.path, SELECTED_PATH, CHANGED);
  const dirtyBefore = git(modified.path, ["status", "--porcelain=v2", "--untracked-files=all"]);
  const current = captureBuilderTrackedTextSelection(modified.path, request());
  assert.ok(current);
  assert.equal(current.context.selectedTrackedText[0]?.content, CHANGED,
    "selection must read complete current worktree bytes, not the committed blob");
  assert.equal(current.context.selectedTrackedText[0]?.sha256, sha256(CHANGED));
  assert.equal(git(modified.path, ["status", "--porcelain=v2", "--untracked-files=all"]), dirtyBefore);
});

test("tool-free fake is exact-context, identity-bound, one-use, bounded and exposes zero ambient authority", async () => {
  const project = repository("transport");
  const first = captureBuilderTrackedTextSelection(project.path, request());
  const byteIdenticalOther = captureBuilderTrackedTextSelection(project.path, request());
  assert.ok(first && byteIdenticalOther);
  assert.notEqual(first.context, byteIdenticalOther.context);
  assert.equal(builderTurnContextSha256(first.context), builderTurnContextSha256(byteIdenticalOther.context));

  const transport = createTask232FakeBuilderTransport(first.context);
  assert.ok(transport);
  assert.equal(await sendTask232FakeBuilderTurn(transport, byteIdenticalOther.context), null);
  assert.equal(await sendTask232FakeBuilderTurn(transport, structuredClone(first.context)), null);
  const answer = await sendTask232FakeBuilderTurn(transport, first.context);
  assert.ok(answer);
  assert.deepEqual(answer.receipt, {
    version: "cairn-task232-tool-free-fake-transport/v1",
    contextSha256: builderTurnContextSha256(first.context),
    attempts: 1,
    toolDefinitions: 0,
    processHandles: 0,
    networkHandles: 0,
    credentialHandles: 0,
    ambientMessages: 0,
  });
  assert.equal(answer.response.kind, "replacement-proposal");
  if (answer.response.kind === "replacement-proposal") {
    assert.equal(answer.response.replacements[0]?.projectRelativePath, SELECTED_PATH);
    assert.equal(answer.response.replacements[0]?.beforeSha256, sha256(BEFORE));
    assert.equal(answer.response.replacements[0]?.afterText, TASK232_FAKE_BUILDER_AFTER_TEXT);
  }
  assert.equal(task232FakeBuilderAnswerMatches(transport, first.context, answer), true);
  assert.equal(task232FakeBuilderAnswerMatches(transport, first.context, structuredClone(answer)), false);
  assert.equal(await sendTask232FakeBuilderTurn(transport, first.context), null);
  const response = consumeTask232FakeBuilderAnswer(transport, first.context, answer);
  assert.ok(response);
  assert.equal(consumeTask232FakeBuilderAnswer(transport, first.context, answer), null);
  assert.equal(task232FakeBuilderAnswerMatches(transport, first.context, answer), false);
});

test("selection refuses untracked, ignored, binary, credential, generated, control, outside and malformed paths", () => {
  const untracked = repository("untracked");
  write(untracked.path, "examples/synthetic/untracked.ts", BEFORE);
  assert.equal(captureBuilderTrackedTextSelection(untracked.path, request(["examples/synthetic/untracked.ts"])), null);

  const ignored = repository("ignored", { [SELECTED_PATH]: BEFORE, ".gitignore": `${SELECTED_PATH}\n` });
  assert.equal(captureBuilderTrackedTextSelection(ignored.path, request()), null);

  const locallyIgnored = repository("locally-ignored");
  writeFileSync(join(locallyIgnored.path, ".git", "info", "exclude"), `${SELECTED_PATH}\n`, "utf8");
  assert.equal(captureBuilderTrackedTextSelection(locallyIgnored.path, request()), null);

  const attributed = repository("attributed", {
    [SELECTED_PATH]: BEFORE,
    ".gitattributes": `${SELECTED_PATH} filter=synthetic\n`,
  });
  assert.equal(captureBuilderTrackedTextSelection(attributed.path, request()), null);

  const includedConfig = repository("included-config");
  const configPath = join(includedConfig.path, ".git", "config");
  writeFileSync(configPath, `${readFileSync(configPath, "utf8")}\n[include]\n\tpath = outside-config\n`, "utf8");
  assert.equal(captureBuilderTrackedTextSelection(includedConfig.path, request()), null,
    "repository config must refuse external include reads before invoking Git in that repository");

  const binary = repository("binary", { [SELECTED_PATH]: Buffer.from([0xff, 0x00, 0xfe]) });
  assert.equal(captureBuilderTrackedTextSelection(binary.path, request()), null);

  const secretPath = repository("secret-path", { ".env": "SAFE_SYNTHETIC_ONLY=true\n" });
  assert.equal(captureBuilderTrackedTextSelection(secretPath.path, request([".env"])), null);

  const secretContent = repository("secret-content", {
    [SELECTED_PATH]: "api_key = 'sk-testtask232synthetic0123456789'\n",
  });
  assert.equal(captureBuilderTrackedTextSelection(secretContent.path, request()), null);

  const generated = repository("generated", { "dist/greeting.ts": BEFORE });
  assert.equal(captureBuilderTrackedTextSelection(generated.path, request(["dist/greeting.ts"])), null);

  const control = repository("control", { "AGENTS.md": "synthetic control\n" });
  assert.equal(captureBuilderTrackedTextSelection(control.path, request(["AGENTS.md"])), null);

  const ordinary = repository("unsafe-spellings");
  for (const unsafe of [
    "../outside.txt", "/absolute.txt", "examples\\synthetic\\greeting.ts", "examples/synthetic/Σ.ts",
    "examples/synthetic/CON.txt", "examples//synthetic/greeting.ts", ".github/workflows/build.yml",
  ]) assert.equal(captureBuilderTrackedTextSelection(ordinary.path, request([unsafe])), null, unsafe);
});

test("selection refuses Git symlink entries, hard links, junction escapes and case aliases", () => {
  const indexLink = repository("index-symlink");
  const oid = git(indexLink.path, ["hash-object", "-w", "--stdin"], Buffer.from("outside-target\n", "utf8"));
  git(indexLink.path, ["update-index", "--cacheinfo", `120000,${oid},${SELECTED_PATH}`]);
  assert.equal(captureBuilderTrackedTextSelection(indexLink.path, request()), null);

  const hardLink = repository("hardlink");
  const selected = join(hardLink.path, ...SELECTED_PATH.split("/"));
  const sibling = join(hardLink.path, "same-bytes.ts");
  writeFileSync(sibling, BEFORE, "utf8");
  unlinkSync(selected);
  linkSync(sibling, selected);
  assert.equal(captureBuilderTrackedTextSelection(hardLink.path, request()), null);

  const junctionProject = repository("junction");
  const outside = own("task232-junction-outside-");
  write(outside.path, "greeting.ts", BEFORE);
  const synthetic = join(junctionProject.path, "examples", "synthetic");
  renameSync(synthetic, join(junctionProject.path, "examples", "synthetic-original"));
  symlinkSync(outside.path, synthetic, process.platform === "win32" ? "junction" : "dir");
  assert.equal(captureBuilderTrackedTextSelection(junctionProject.path, request()), null);

  const alias = repository("case-alias");
  assert.equal(captureBuilderTrackedTextSelection(alias.path, request(["EXAMPLES/synthetic/greeting.ts"])), null);
});

test("selector input rejects accessors, Proxies, extras, duplicates and unsorted aliases without reading getters", () => {
  const project = repository("caller-data");
  const valid = request();
  assert.equal(captureBuilderTrackedTextSelection(project.path, new Proxy(valid, {})), null);
  assert.equal(captureBuilderTrackedTextSelection(project.path, { ...valid, extra: true }), null);
  assert.equal(captureBuilderTrackedTextSelection(project.path, {
    ...valid,
    selectedProjectRelativePaths: [SELECTED_PATH, SELECTED_PATH.toUpperCase()],
  }), null);
  assert.equal(captureBuilderTrackedTextSelection(project.path, {
    ...valid,
    selectedProjectRelativePaths: ["z/safe.ts", SELECTED_PATH],
  }), null);
  let read = false;
  const accessor = { ...valid } as Record<string, unknown>;
  Object.defineProperty(accessor, "selectedProjectRelativePaths", {
    enumerable: true,
    get() { read = true; return [SELECTED_PATH]; },
  });
  assert.equal(captureBuilderTrackedTextSelection(project.path, accessor), null);
  assert.equal(read, false);
});

test("file identity, bytes and Git state drift fail closed before fake or append", async () => {
  const bytesProject = repository("changed-bytes");
  const bytesSelection = captureBuilderTrackedTextSelection(bytesProject.path, request());
  assert.ok(bytesSelection);
  write(bytesProject.path, SELECTED_PATH, CHANGED);
  assert.equal(builderTrackedTextSelectionStillExact(bytesProject.path, bytesSelection), false);

  const identityProject = repository("changed-identity");
  const identitySelection = captureBuilderTrackedTextSelection(identityProject.path, request());
  assert.ok(identitySelection);
  const selected = join(identityProject.path, ...SELECTED_PATH.split("/"));
  const old = `${selected}.old`;
  renameSync(selected, old);
  writeFileSync(selected, BEFORE, "utf8");
  assert.equal(builderTrackedTextSelectionStillExact(identityProject.path, identitySelection), false,
    "byte-identical replacement cannot substitute for the selected file identity");

  const gitProject = repository("changed-git");
  const gitSelection = captureBuilderTrackedTextSelection(gitProject.path, request());
  assert.ok(gitSelection);
  write(gitProject.path, "unrelated.txt", "new Git state\n");
  git(gitProject.path, ["add", "--", "unrelated.txt"]);
  git(gitProject.path, [
    "-c", "user.name=Cairn Task 232", "-c", "user.email=task232@example.invalid",
    "commit", "-m", "Change Git state",
  ]);
  assert.equal(builderTrackedTextSelectionStillExact(gitProject.path, gitSelection), false);

  const indexProject = repository("changed-index-identity");
  const indexSelection = captureBuilderTrackedTextSelection(indexProject.path, request());
  assert.ok(indexSelection);
  const indexPath = join(indexProject.path, ".git", "index");
  const indexBytes = readFileSync(indexPath);
  renameSync(indexPath, `${indexPath}.old`);
  writeFileSync(indexPath, indexBytes);
  assert.equal(builderTrackedTextSelectionStillExact(indexProject.path, indexSelection), false,
    "a byte-identical replacement cannot substitute for the selected Git control-file identity");

  const during = repository("during-fake");
  const duringProfile = profile("during-fake");
  const prepared = prepareTask232SyntheticBuilderReview(during.path);
  const transport = createTask232FakeBuilderTransport(prepared.context);
  assert.ok(transport);
  const pending = sendTask232FakeBuilderTurn(transport, prepared.context);
  write(during.path, SELECTED_PATH, CHANGED);
  const answer = await pending;
  assert.ok(answer, "the tool-free fake itself observes only its exact context");
  assert.throws(
    () => appendTask232SyntheticBuilderReview(during.path, prepared, transport, answer),
    /TASK232_FAKE_ROUTE_REFUSED/u,
  );
  noPersistence(during.path, duringProfile.path);
});

test("genuine selected context flows through the injected fake into Task 231 custody exactly once", async () => {
  const project = repository("route");
  const ownedProfile = profile("route");
  assert.equal(ensureCairnExcluded(project.path), true);
  const selection = prepareTask232SyntheticBuilderReview(project.path);
  const transport = createTask232FakeBuilderTransport(selection.context);
  assert.ok(transport);
  const answer = await sendTask232FakeBuilderTurn(transport, selection.context);
  assert.ok(answer);
  const appended = appendTask232SyntheticBuilderReview(project.path, selection, transport, answer);
  const turns = readTurns(project.path, appended.conversationId);
  assert.deepEqual(turns, [appended.turn]);
  assert.equal(turns[0]?.role, "builder-review");
  assert.equal(builderReviewMarkerSequence(project.path).length, 1);
  assert.equal(readFileSync(join(project.path, ...SELECTED_PATH.split("/")), "utf8"), BEFORE);
  assert.equal(git(project.path, ["status", "--porcelain=v2", "--untracked-files=all"]), "");
  const markerFiles = readdirSync(join(ownedProfile.path, "builder-review-markers"));
  assert.equal(markerFiles.length, 1);
  const marker = readFileSync(join(ownedProfile.path, "builder-review-markers", markerFiles[0]!), "utf8");
  assert.doesNotMatch(marker, /syntheticBefore|syntheticAfter|selector|transport|selectedTrackedText/u);
  assert.throws(
    () => appendTask232SyntheticBuilderReview(project.path, selection, transport, answer),
    /TASK232_FAKE_ROUTE_REFUSED/u,
  );
});

function source(path: string): string {
  return readFileSync(resolve(APP_ROOT, path), "utf8");
}

function assertSelectorSourceSafe(value: string): void {
  assert.match(value, /builderSelectedTrackedTextPathAllowed\(projectPath\)/u);
  assert.match(value, /value\.nlink === 1n/u);
  assert.equal((value.match(/sameFileIdentity\(opened, rebound\)/gu) ?? []).length, 2);
  assert.match(value, /sameGitState\(beforeGit, afterGit\)/u);
  assert.match(value, /builderReviewProjectStillExact\(root, project\)/u);
  assert.match(value, /core\.attributesFile=\/dev\/null/u);
  const config = value.indexOf("const configBefore = readBoundedControlFile");
  const repositoryGit = value.indexOf("const gitDir = gitDirectory", config);
  assert.ok(config >= 0 && repositoryGit > config,
    "repository config must be inspected before Git can read repository-selected configuration");
  assert.doesNotMatch(value, /node:(?:http|https|net|tls|dns|dgram|worker_threads)|\bfetch\s*\(|\bWebSocket\b/u);
  assert.doesNotMatch(value, /\b(?:writeFile|appendFile|rename|unlink|rm|mkdir)Sync\b/u);
}

function assertFakeSourceSafe(value: string): void {
  const imports = [...value.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => match[1]);
  const executable = value.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/gu, "");
  assert.deepEqual(imports, ["@cairn/core"]);
  assert.equal((value.match(/state\.context !== contextValue/gu) ?? []).length, 2);
  assert.match(value, /state\.spent = true;\s*await Promise\.resolve\(\)/u);
  assert.doesNotMatch(executable, /\bimport\s*["']/u);
  assert.doesNotMatch(executable, /\bprocess\b|\bglobalThis\b|\bfetch\b|\bWebSocket\b|\bXMLHttpRequest\b|\bEventSource\b|\bnavigator\b|\bDeno\b|\bBun\b|\bcrypto\b|\bconsole\b|\bsetTimeout\b|\bsetInterval\b|\bqueueMicrotask\b|\bcallback\b|\bendpoint\b|\btools?\s*:/iu);
  assert.doesNotMatch(executable, /\b(?:import\s*\(|require\s*\(|eval\s*\(|Function\s*\()/u);
}

function assertRouteSourceSafe(value: string): void {
  assert.deepEqual([...value.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => match[1]), [
    "../shared/ipc.js",
    "./builderfaketransport.js",
    "./builderproposalreviewfixture.js",
    "./buildertrackedtext.js",
    "./conductor/store.js",
  ]);
  assert.doesNotMatch(value, /node:(?:child_process|fs|http|https|net|tls)|\bprocess\.env\b|\bfetch\s*\(/u);
  const start = value.indexOf("export function appendTask232SyntheticBuilderReview(");
  assert.ok(start >= 0);
  const body = value.slice(start);
  assert.equal((body.match(/builderTrackedTextSelectionStillExact\(projectRoot, selection\)/gu) ?? []).length, 3);
  assert.match(body, /builderTrackedTextSelectionStillExact\(projectRoot, selection\)[\s\S]*?task232FakeBuilderAnswerMatches/u);
  assert.match(body, /const response = consumeTask232FakeBuilderAnswer[\s\S]*?if \(response === null \|\| !builderTrackedTextSelectionStillExact\(projectRoot, selection\)\)[\s\S]*?const conversationId = newConversationId/u);
  assert.match(body, /newConversationId\(projectRoot\)[\s\S]*?builderTrackedTextSelectionStillExact\(projectRoot, selection\)[\s\S]*?appendBuilderReviewTurn/u);
}

function assertMainGuardSafe(value: string): void {
  assert.match(value, /function task232OwnedDisposableDirectory\(\s*value: unknown,\s*kind: "project" \| "profile"/u);
  assert.match(value, /function task232OwnedDisposableDirectoryStillExact/u);
  assert.equal((value.match(/task232OwnedDisposableDirectoryStillExact\(task232E2eProjectRoot\)/gu) ?? []).length, 2);
  assert.equal((value.match(/task232OwnedDisposableDirectoryStillExact\(task232E2eProfileRoot\)/gu) ?? []).length, 2);
  assert.match(value, /\^cairn-task232-\$\{kind\}-\[A-Za-z0-9\]\{6\}\$/u);
  assert.match(value, /lexical === real && path\.dirname\(real\) === tempRoot/u);
  assert.match(value, /process\.env\.CAIRN_TEST_BUILDER_REVIEW !== undefined/u);
  assert.match(value, /process\.env\.CAIRN_TEST_BUILDER_TRACKED_TEXT === "task232-fixed-v1"/u);
  assert.match(value, /builderReviewE2eRequested && \(process\.env\.CAIRN_E2E !== "1" \|\| process\.env\.CAIRN_MOCK !== "1"\s*\|\| task232E2eProjectRoot === null \|\| task232E2eProfileRoot === null\)/u);
  const guarded = value.indexOf("if (builderReviewE2eRequested) {");
  const hook = value.indexOf("__CAIRN_TASK232_APPEND_BUILDER_REVIEW__", guarded);
  const spent = value.indexOf("used = true;", hook);
  const ownership = value.indexOf("task232OwnedDisposableDirectoryStillExact(task232E2eProjectRoot)", spent);
  const selection = value.indexOf("prepareTask232SyntheticBuilderReview(projectRoot)", ownership);
  const fake = value.indexOf("createTask232FakeBuilderTransport(selection.context)", hook);
  const send = value.indexOf("sendTask232FakeBuilderTurn(transport, selection.context)", fake);
  const append = value.indexOf("appendTask232SyntheticBuilderReview(projectRoot, selection, transport, answer)", send);
  assert.ok(guarded >= 0 && hook > guarded && spent > hook && ownership > spent && selection > ownership
    && fake > selection && send > fake && append > send);
}

function sourceConsumers(symbol: string, owner: string, extras: readonly Readonly<{ path: string; text: string }>[] = []): string[] {
  const root = resolve(APP_ROOT, "src");
  const files: Array<Readonly<{ path: string; text: string }>> = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) {
        files.push({ path: relative(root, path).replaceAll("\\", "/"), text: readFileSync(path, "utf8") });
      }
    }
  };
  walk(root);
  return [...files, ...extras].filter((file) => file.path !== owner && file.text.includes(symbol)).map((file) => file.path).sort();
}

test("source guards and load-bearing mutants close selector, identity, fake-only, consumer and effect routes", () => {
  const selector = source("src/main/buildertrackedtext.ts");
  const fake = source("src/main/builderfaketransport.ts");
  const route = source("src/main/builderreviewroutefixture.ts");
  const main = source("src/main/main.ts");
  assertSelectorSourceSafe(selector);
  assertFakeSourceSafe(fake);
  assertRouteSourceSafe(route);
  assertMainGuardSafe(main);

  const noPathGate = selector.replace("builderSelectedTrackedTextPathAllowed(projectPath)", "true /* mutant */");
  assert.notEqual(noPathGate, selector);
  assert.throws(() => assertSelectorSourceSafe(noPathGate));
  const noIdentity = selector.replace("sameFileIdentity(opened, rebound)", "true /* mutant */");
  assert.notEqual(noIdentity, selector);
  assert.throws(() => assertSelectorSourceSafe(noIdentity));
  const cloneTransport = fake.replace("state.context !== contextValue", "false /* mutant: canonical bytes substitute */");
  assert.notEqual(cloneTransport, fake);
  assert.throws(() => assertFakeSourceSafe(cloneTransport));
  const effectImport = `import "node:net";\n${fake}`;
  assert.throws(() => assertFakeSourceSafe(effectImport));
  const missingConsumerRecheck = route.replace(
    "if (response === null || !builderTrackedTextSelectionStillExact(projectRoot, selection))",
    "if (response === null /* mutant: stale selection may append */)",
  );
  assert.notEqual(missingConsumerRecheck, route);
  assert.throws(() => assertRouteSourceSafe(missingConsumerRecheck));
  const ordinaryLaunch = main.replace(
    'process.env.CAIRN_TEST_BUILDER_TRACKED_TEXT === "task232-fixed-v1"',
    'process.env.CAIRN_TEST_BUILDER_TRACKED_TEXT !== "disabled" /* mutant */',
  );
  assert.notEqual(ordinaryLaunch, main);
  assert.throws(() => assertMainGuardSafe(ordinaryLaunch));
  const unownedProject = main.replaceAll("path.dirname(real) === tempRoot", "true /* mutant: any directory */");
  assert.notEqual(unownedProject, main);
  assert.throws(() => assertMainGuardSafe(unownedProject));
  const replacedOwnership = main.replace(
    "task232OwnedDisposableDirectoryStillExact(task232E2eProjectRoot)",
    "true /* mutant: replaced disposable root */",
  );
  assert.notEqual(replacedOwnership, main);
  assert.throws(() => assertMainGuardSafe(replacedOwnership));

  assert.deepEqual(sourceConsumers("captureBuilderTrackedTextSelection", "main/buildertrackedtext.ts"), [
    "main/builderlivereviewroutefixture.ts",
    "main/builderreviewroutefixture.ts",
  ]);
  assert.deepEqual(sourceConsumers("builderTrackedTextSelectionMatchesContext", "main/buildertrackedtext.ts"), [
    "main/builderlivereviewroutefixture.ts",
    "main/builderreviewroutefixture.ts",
  ]);
  assert.deepEqual(sourceConsumers("builderTrackedTextSelectionStillExact", "main/buildertrackedtext.ts"), [
    "main/builderlivereviewroutefixture.ts",
    "main/builderreviewroutefixture.ts",
  ]);
  assert.deepEqual(sourceConsumers("createTask232FakeBuilderTransport", "main/builderfaketransport.ts"), ["main/main.ts"]);
  assert.deepEqual(sourceConsumers("sendTask232FakeBuilderTurn", "main/builderfaketransport.ts"), ["main/main.ts"]);
  assert.deepEqual(sourceConsumers("consumeTask232FakeBuilderAnswer", "main/builderfaketransport.ts"), [
    "main/builderreviewroutefixture.ts",
  ]);
  assert.deepEqual(sourceConsumers("task232FakeBuilderAnswerMatches", "main/builderfaketransport.ts"), [
    "main/builderreviewroutefixture.ts",
  ]);
  assert.deepEqual(sourceConsumers("appendTask232SyntheticBuilderReview", "main/builderreviewroutefixture.ts"), ["main/main.ts"]);
  assert.deepEqual(sourceConsumers("captureBuilderTrackedTextSelection", "main/buildertrackedtext.ts", [{
    path: "renderer/rogue.tsx",
    text: "void captureBuilderTrackedTextSelection;",
  }]), ["main/builderlivereviewroutefixture.ts", "main/builderreviewroutefixture.ts", "renderer/rogue.tsx"]);
});

test("fixed request identities are stable but cannot act through clones or serialized records", () => {
  const project = repository(`records-${randomUUID()}`);
  const selection = captureBuilderTrackedTextSelection(project.path, request());
  assert.ok(selection);
  const record = JSON.parse(JSON.stringify(selection));
  assert.equal(builderTrackedTextSelectionStillExact(project.path, record), false);
  assert.equal(builderTrackedTextSelectionMatchesContext(record, selection.context), false);
  assert.equal(createTask232FakeBuilderTransport(record.context), null);
});
