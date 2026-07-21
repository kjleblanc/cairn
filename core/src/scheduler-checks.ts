import { lstatSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const PASSIVE_ARTIFACT_MAX_BYTES = 256 * 1024;
export const PASSIVE_LITERAL_MAX_BYTES = 8 * 1024;
export const PASSIVE_ASSERTION_LIMIT = 16;

export type PassiveLineEndings = "exact" | "normalize";

export type PassiveAssertion =
  | { kind: "fileExists"; path: string }
  | { kind: "utf8Equals"; path: string; expected: string; lineEndings: PassiveLineEndings }
  | { kind: "utf8Contains"; path: string; fragments: string[]; lineEndings: PassiveLineEndings };

export class PassiveCheckError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

function exactObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "Each assertion must be one plain object.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) => !("value" in descriptor) || !descriptor.enumerable) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "An assertion has missing, unknown, hidden, or accessor fields.");
  }
  return value as Record<string, unknown>;
}

function boundedLiteral(value: unknown, label: string): string {
  if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value, "utf8") > PASSIVE_LITERAL_MAX_BYTES) {
    throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", `${label} must be bounded UTF-8 text without NUL bytes.`);
  }
  return value;
}

function lineEndings(value: unknown): PassiveLineEndings {
  if (value !== "exact" && value !== "normalize") {
    throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "lineEndings must be exact or normalize.");
  }
  return value;
}

export function validatePassiveAssertions(value: unknown, allowedPaths: readonly string[]): PassiveAssertion[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > PASSIVE_ASSERTION_LIMIT) {
    throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", `Choose between 1 and ${PASSIVE_ASSERTION_LIMIT} declarative assertions.`);
  }
  const allowed = new Set(allowedPaths);
  return value.map((raw): PassiveAssertion => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "Each assertion must be one plain object.");
    }
    const kind = (raw as { kind?: unknown }).kind;
    if (kind === "fileExists") {
      const object = exactObject(raw, ["kind", "path"]);
      if (typeof object.path !== "string" || !allowed.has(object.path)) {
        throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "fileExists must name one frozen artifact path.");
      }
      return { kind, path: object.path };
    }
    if (kind === "utf8Equals") {
      const object = exactObject(raw, ["kind", "path", "expected", "lineEndings"]);
      if (typeof object.path !== "string" || !allowed.has(object.path)) {
        throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "utf8Equals must name one frozen artifact path.");
      }
      return { kind, path: object.path, expected: boundedLiteral(object.expected, "expected"), lineEndings: lineEndings(object.lineEndings) };
    }
    if (kind === "utf8Contains") {
      const object = exactObject(raw, ["kind", "path", "fragments", "lineEndings"]);
      if (typeof object.path !== "string" || !allowed.has(object.path) || !Array.isArray(object.fragments) ||
          object.fragments.length < 1 || object.fragments.length > 16) {
        throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "utf8Contains must name one frozen path and 1-16 literal fragments.");
      }
      return {
        kind,
        path: object.path,
        fragments: object.fragments.map((fragment, index) => boundedLiteral(fragment, `fragments[${index}]`)),
        lineEndings: lineEndings(object.lineEndings),
      };
    }
    throw new PassiveCheckError("DECLARATIVE_CHECK_INVALID", "Executable, command, parser, and unknown assertion kinds are refused.");
  });
}

function pathInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function readPassiveArtifact(root: string, path: string): string {
  const absolute = resolve(root, path);
  if (!pathInside(root, absolute)) throw new PassiveCheckError("PASSIVE_PATH_ESCAPE", `Artifact escaped the worktree: ${path}`);
  const link = lstatSync(absolute);
  const stat = statSync(absolute);
  if (link.isSymbolicLink() || !link.isFile() || !stat.isFile() || stat.nlink !== 1 || stat.size > PASSIVE_ARTIFACT_MAX_BYTES) {
    throw new PassiveCheckError("PASSIVE_PATH_ESCAPE", `Artifact is not one bounded, regular, singly-linked file: ${path}`);
  }
  const bytes = readFileSync(absolute);
  if (bytes.includes(0)) throw new PassiveCheckError("PASSIVE_PATH_ESCAPE", `Artifact contains a NUL byte: ${path}`);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PassiveCheckError("PASSIVE_PATH_ESCAPE", `Artifact is not valid UTF-8: ${path}`);
  }
}

function comparable(text: string, policy: PassiveLineEndings): string {
  if (policy === "exact") return text;
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.includes("\r")) throw new PassiveCheckError("DECLARATIVE_CHECK_FAILED", "A passive artifact contains an unsupported bare carriage return.");
  return normalized;
}

/** Bounded filesystem reads and string comparisons only. This function starts no process and imports no artifact. */
export function evaluatePassiveAssertions(root: string, assertions: readonly PassiveAssertion[]): void {
  const cache = new Map<string, string>();
  const read = (path: string): string => {
    if (!cache.has(path)) cache.set(path, readPassiveArtifact(root, path));
    return cache.get(path)!;
  };
  for (const assertion of assertions) {
    const actual = read(assertion.path);
    if (assertion.kind === "fileExists") continue;
    if (assertion.kind === "utf8Equals") {
      if (comparable(actual, assertion.lineEndings) !== comparable(assertion.expected, assertion.lineEndings)) {
        throw new PassiveCheckError("DECLARATIVE_CHECK_FAILED", `Artifact did not equal its frozen literal: ${assertion.path}`);
      }
      continue;
    }
    const compared = comparable(actual, assertion.lineEndings);
    for (const fragment of assertion.fragments) {
      if (!compared.includes(comparable(fragment, assertion.lineEndings))) {
        throw new PassiveCheckError("DECLARATIVE_CHECK_FAILED", `Artifact omitted a frozen literal fragment: ${assertion.path}`);
      }
    }
  }
}
