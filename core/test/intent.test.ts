import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  bindTaskIntent,
  canonicalTaskIntent,
  createDirectTaskIntent,
  parseTaskIntentCandidate,
  parseTaskIntentCandidateEnvelopeJson,
  taskRequestSha256,
  taskRequestView,
  validateTaskIntent,
  type TaskIntentCandidate,
  type TaskIntentSourceInput,
} from "../src/index.js";

const chosen = (text: string) => ({
  source: "cairn-chosen" as const,
  text,
  ownerQuote: null,
});

const stated = (text: string, ownerQuote: string) => ({
  source: "owner-stated" as const,
  text,
  ownerQuote,
});

const unsure = (text: string, ownerQuote: string) => ({
  source: "owner-unsure" as const,
  text,
  ownerQuote,
});

const candidate = (
  outcome: TaskIntentCandidate["outcome"],
  requirements: TaskIntentCandidate["requirements"] = [],
  context: TaskIntentCandidate["context"] = [],
): TaskIntentCandidate => ({
  version: "cairn-task-intent/v1",
  outcome,
  requirements,
  context,
});

const inputId = (label: string): string =>
  `00000000-0000-4000-8000-${createHash("sha256").update(label).digest("hex").slice(0, 12)}`;

const source = (
  label: string,
  text: string,
  kind: TaskIntentSourceInput["kind"] = "conversation",
): TaskIntentSourceInput => ({ kind, inputId: inputId(label), text });

test("intent: binds the latest authenticated turn and its first exact UTF-16 span", () => {
  const quote = "Maybe 300 ms?";
  const inputs = [
    source("turn-old", `Old: ${quote}`),
    source("turn-new", `😀 ${quote} Then ${quote}`),
  ];
  const bound = bindTaskIntent(candidate(
    stated("Keep the animation calm", "Keep it calm"),
    [
      unsure("Try a 300 ms settling speed", quote),
      chosen("Use a spring curve"),
    ],
    ["Renaming may break bookmarked links."],
  ), [source("turn-outcome", "Please: Keep it calm"), ...inputs]);

  assert.ok(bound);
  assert.equal(bound.requirements[0].source, "owner-unsure");
  assert.deepEqual(bound.requirements[0].owner, {
    kind: "conversation",
    inputId: inputId("turn-new"),
    start: 3,
    end: 16,
    text: quote,
  });
  assert.equal(inputs[1].text.slice(3, 16), quote, "offsets are JavaScript UTF-16 code units");
  assert.equal(bound.context[0], "Renaming may break bookmarked links.");
});

test("intent: candidate parsing and bound intents are defensive deep-frozen copies", () => {
  const original = candidate(stated("Keep the exact wording", "  exact\r\nwording  "), [chosen("Use mint")], ["Context"]);
  const parsed = parseTaskIntentCandidate(original);
  assert.ok(parsed);
  const authenticated = source("turn-1", "Before  exact\r\nwording  after");
  const bound = bindTaskIntent(parsed, [authenticated]);
  assert.ok(bound);
  const canonicalBeforeMutation = canonicalTaskIntent(bound);

  (original.outcome as { text: string }).text = "mutated later";
  (original.requirements as Array<ReturnType<typeof chosen>>).push(chosen("late row"));
  (authenticated as { text: string }).text = "source mutated later";
  assert.equal(parsed.outcome.text, "Keep the exact wording");
  assert.equal(parsed.requirements.length, 1);
  assert.equal(canonicalTaskIntent(bound), canonicalBeforeMutation);

  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.outcome));
  assert.ok(Object.isFrozen(parsed.requirements));
  assert.ok(Object.isFrozen(parsed.context));
  assert.ok(Object.isFrozen(bound));
  assert.ok(Object.isFrozen(bound.outcome));
  assert.ok(Object.isFrozen(bound.requirements));
  assert.ok(Object.isFrozen(bound.requirements[0]));
  assert.ok(Object.isFrozen(bound.context));
  if (bound.outcome.source === "cairn-chosen") assert.fail("expected an owner span");
  assert.ok(Object.isFrozen(bound.outcome.owner));
  assert.throws(() => {
    (bound.requirements as unknown as Array<unknown>).push(chosen("cannot append"));
  }, TypeError);
});

test("intent: direct input preserves every accepted code unit and redacts authority from its view", () => {
  const raw = "  Build this\r\nexactly 😀  ";
  const intent = createDirectTaskIntent(raw, inputId("direct-1"));
  assert.ok(intent);
  assert.equal(intent.outcome.source, "owner-stated");
  assert.deepEqual(intent.outcome.owner, {
    kind: "direct",
    inputId: inputId("direct-1"),
    start: 0,
    end: raw.length,
    text: raw,
  });

  const view = taskRequestView(intent);
  assert.ok(view);
  assert.deepEqual(view, {
    outcome: { source: "owner-stated", text: raw.trim(), ownerText: raw },
    requirements: [],
  });
  assert.ok(Object.isFrozen(view));
  assert.ok(Object.isFrozen(view.outcome));
  assert.ok(Object.isFrozen(view.requirements));
  const encoded = JSON.stringify(view);
  assert.doesNotMatch(encoded, /inputId|start|end|context|version/);
});

test("intent: canonical JSON has fixed key order and its SHA-256 binds every authority field", () => {
  const baseCandidate = candidate(
    stated("Use the owner's title", "Title: Cairn"),
    [chosen("Use a quiet neutral label"), unsure("Treat 300 as tentative", "maybe 300")],
    ["Keep the existing breakpoint."],
  );
  const inputs = [source("turn-a", "Title: Cairn"), source("turn-b", "maybe 300")];
  const intent = bindTaskIntent(baseCandidate, inputs);
  assert.ok(intent);

  const canonical = canonicalTaskIntent(intent);
  assert.equal(canonical, JSON.stringify({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Use the owner's title",
      owner: { kind: "conversation", inputId: inputId("turn-a"), start: 0, end: 12, text: "Title: Cairn" },
    },
    requirements: [
      { source: "cairn-chosen", text: "Use a quiet neutral label", owner: null },
      {
        source: "owner-unsure",
        text: "Treat 300 as tentative",
        owner: { kind: "conversation", inputId: inputId("turn-b"), start: 0, end: 9, text: "maybe 300" },
      },
    ],
    context: ["Keep the existing breakpoint."],
  }));
  assert.equal(taskRequestSha256(intent), createHash("sha256").update(canonical).digest("hex"));

  const provenanceVariants = [
    bindTaskIntent(baseCandidate, [source("turn-a-changed", "Title: Cairn"), source("turn-b", "maybe 300")]),
    bindTaskIntent(baseCandidate, [source("turn-a", `xTitle: Cairn`), source("turn-b", "maybe 300")]),
    bindTaskIntent(baseCandidate, [source("turn-a", "Title: Cairn", "direct"), source("turn-b", "maybe 300")]),
  ];
  const contextVariant = bindTaskIntent(candidate(baseCandidate.outcome, baseCandidate.requirements, ["Different context."]), inputs);
  const variants = [
    ...provenanceVariants,
    bindTaskIntent(candidate(
      stated("Use the owner's title differently", "Title: Cairn"),
      baseCandidate.requirements,
      baseCandidate.context,
    ), inputs),
    bindTaskIntent(candidate(baseCandidate.outcome, [...baseCandidate.requirements].reverse(), baseCandidate.context), inputs),
    contextVariant,
    bindTaskIntent(candidate(baseCandidate.outcome, [
      baseCandidate.requirements[0],
      unsure("Treat 300 as a tentative starting point", "maybe 300"),
    ], baseCandidate.context), inputs),
    bindTaskIntent(candidate(baseCandidate.outcome, [
      baseCandidate.requirements[0],
      stated("Treat 300 as tentative", "maybe 300"),
    ], baseCandidate.context), inputs),
    bindTaskIntent(candidate(
      stated("Use the owner's title", "Title: Cairm"),
      baseCandidate.requirements,
      baseCandidate.context,
    ), [source("turn-a", "Title: Cairm"), source("turn-b", "maybe 300")]),
    bindTaskIntent(candidate(
      baseCandidate.outcome,
      [chosen("Use a quiet neutral label"), stated("Treat 300 as firm", "maybe 300")],
      baseCandidate.context,
    ), inputs),
  ];
  for (const variant of variants) {
    assert.ok(variant);
    assert.notEqual(canonicalTaskIntent(variant), canonical);
    assert.notEqual(taskRequestSha256(variant), taskRequestSha256(intent));
  }
  for (const variant of provenanceVariants) {
    assert.deepEqual(taskRequestView(variant), taskRequestView(intent), "source identity stays out of the view");
  }
  assert.deepEqual(taskRequestView(contextVariant), taskRequestView(intent), "context stays out of the view but inside the digest");
  const contextOrderA = bindTaskIntent(candidate(chosen("Outcome"), [], ["first", "second"]), []);
  const contextOrderB = bindTaskIntent(candidate(chosen("Outcome"), [], ["second", "first"]), []);
  assert.ok(contextOrderA);
  assert.ok(contextOrderB);
  assert.notEqual(canonicalTaskIntent(contextOrderA), canonicalTaskIntent(contextOrderB));
  assert.notEqual(taskRequestSha256(contextOrderA), taskRequestSha256(contextOrderB));
});

test("intent: a serialized intent must be revalidated against the authenticated source", () => {
  const inputs = [source("turn-1", "Use 400 exactly")];
  const bound = bindTaskIntent(candidate(stated("Use 400", "400 exactly")), inputs);
  assert.ok(bound);
  const stored = JSON.parse(JSON.stringify(bound)) as unknown;

  assert.equal(canonicalTaskIntent(stored), null, "an unvalidated clone is not an authority");
  assert.equal(taskRequestView(stored), null);
  const restored = validateTaskIntent(stored, inputs);
  assert.ok(restored);
  assert.equal(canonicalTaskIntent(restored), canonicalTaskIntent(bound));

  const wrongText = JSON.parse(JSON.stringify(bound)) as any;
  wrongText.outcome.owner.text = "400 maybe";
  assert.equal(validateTaskIntent(wrongText, inputs), null);
  const wrongOffset = JSON.parse(JSON.stringify(bound)) as any;
  wrongOffset.outcome.owner.start += 1;
  assert.equal(validateTaskIntent(wrongOffset, inputs), null);
  assert.equal(validateTaskIntent(stored, [source("turn-1", "The source changed")]), null);
});

test("intent: firm, tentative, and Cairn-chosen rows enforce their exact owner shape", () => {
  const inputs = [source("turn-1", "Owner words")];
  assert.ok(bindTaskIntent(candidate(stated("Firm", "Owner words")), inputs));
  assert.ok(bindTaskIntent(candidate(unsure("Tentative", "Owner words")), inputs));
  assert.ok(bindTaskIntent(candidate(chosen("Delegated choice")), []));
  assert.equal(bindTaskIntent(candidate({ ...chosen("Bad"), ownerQuote: "forged" } as any), inputs), null);
  assert.equal(bindTaskIntent(candidate({ ...stated("Bad", "Owner words"), ownerQuote: null } as any), inputs), null);
  assert.equal(bindTaskIntent(candidate(stated("No exact source", "Different words")), inputs), null);
});

test("intent: duplicate rows, missing keys, extra keys, and model-authored authority fail closed", () => {
  const valid = candidate(chosen("Outcome"), [chosen("Requirement")], ["Context"]);
  assert.ok(parseTaskIntentCandidate(valid));
  assert.equal(parseTaskIntentCandidate({ ...valid, extra: true }), null);
  const { version: _version, ...missing } = valid;
  assert.equal(parseTaskIntentCandidate(missing), null);
  assert.equal(parseTaskIntentCandidate({ ...valid, version: "cairn-task-intent/v2" }), null);
  assert.equal(parseTaskIntentCandidate(candidate(chosen("Same"), [chosen("Same")])), null);
  assert.equal(parseTaskIntentCandidate(candidate({
    source: "owner-stated", text: "Bad", ownerQuote: "words", inputId: "model-id", start: 0, end: 5,
  } as any)), null);
});

test("intent: the complete raw candidate envelope cap is enforced before parsing", () => {
  const raw = JSON.stringify({ intent: candidate(chosen("Outcome")), risks: [] });
  const atCap = raw + " ".repeat(12_000 - raw.length);
  assert.equal(atCap.length, 12_000);
  const decoded = parseTaskIntentCandidateEnvelopeJson(atCap);
  assert.ok(decoded && typeof decoded === "object");
  assert.ok(parseTaskIntentCandidate((decoded as { intent: unknown }).intent));
  assert.equal(parseTaskIntentCandidate(decoded), null, "the outer envelope is not an inner intent");
  assert.equal(parseTaskIntentCandidateEnvelopeJson(`${atCap} `), null);
  assert.equal(parseTaskIntentCandidateEnvelopeJson("not json"), null);
});

test("intent: fixed row, context, source, and aggregate limits are exact", () => {
  assert.equal(bindTaskIntent(candidate(chosen("")), []), null);
  assert.equal(bindTaskIntent(candidate(chosen("   ")), []), null);
  assert.equal(bindTaskIntent(candidate(chosen("Outcome"), [chosen("\t")]), []), null);
  assert.equal(bindTaskIntent(candidate(chosen("Outcome"), [], ["\r\n"]), []), null);
  assert.ok(bindTaskIntent(candidate(chosen("o".repeat(300))), []));
  assert.equal(bindTaskIntent(candidate(chosen("o".repeat(301))), []), null);
  assert.ok(bindTaskIntent(candidate(chosen("Outcome"), [chosen("r".repeat(500))]), []));
  assert.equal(bindTaskIntent(candidate(chosen("Outcome"), [chosen("r".repeat(501))]), []), null);
  assert.ok(bindTaskIntent(candidate(chosen("Outcome"), Array.from({ length: 8 }, (_, index) => chosen(`r${index}`))), []));
  assert.equal(bindTaskIntent(candidate(chosen("Outcome"), Array.from({ length: 9 }, (_, index) => chosen(`r${index}`))), []), null);
  assert.ok(bindTaskIntent(candidate(chosen("Outcome"), [], ["a", "b", "c"]), []));
  assert.equal(bindTaskIntent(candidate(chosen("Outcome"), [], ["a", "b", "c", "d"]), []), null);
  assert.ok(bindTaskIntent(candidate(chosen("Outcome"), [], ["c".repeat(1_000)]), []));
  assert.equal(bindTaskIntent(candidate(chosen("Outcome"), [], ["c".repeat(1_001)]), []), null);

  const atSourceCap = "s".repeat(2_000);
  assert.ok(createDirectTaskIntent(atSourceCap, inputId("direct-2000")));
  assert.equal(createDirectTaskIntent(`${atSourceCap}s`, inputId("direct-2001")), null);
  assert.ok(bindTaskIntent(candidate(stated("Conversation source at cap", atSourceCap)), [source("conversation-2000", atSourceCap)]));
  assert.equal(
    bindTaskIntent(candidate(stated("Conversation source over cap", `${atSourceCap}s`)), [source("conversation-2001", `${atSourceCap}s`)]),
    null,
  );
  assert.equal(createDirectTaskIntent("abcd", inputId("direct-too-short")), null);
  assert.ok(createDirectTaskIntent("a b c d e", inputId("direct-five-visible")));
  const atInterpretationCap = createDirectTaskIntent("i".repeat(300), inputId("direct-300"));
  const overInterpretationCap = createDirectTaskIntent("i".repeat(301), inputId("direct-301"));
  assert.ok(atInterpretationCap);
  assert.ok(overInterpretationCap);
  assert.equal(atInterpretationCap.outcome.text, "i".repeat(300));
  assert.equal(overInterpretationCap.outcome.text, "Complete the owner’s exact direct request shown below");
  const emojiAtCap = "😀".repeat(1_000);
  assert.equal(emojiAtCap.length, 2_000);
  assert.ok(createDirectTaskIntent(emojiAtCap, inputId("direct-emoji-2000")));
  assert.equal(createDirectTaskIntent(`${emojiAtCap}😀`, inputId("direct-emoji-over")), null);

  const totalAtCap = candidate(
    chosen("o".repeat(300)),
    [stated("r".repeat(500), "q".repeat(700)), ...Array.from({ length: 7 }, (_, index) => chosen(String(index).padEnd(500, "r")))],
    ["c".repeat(1_000)],
  );
  assert.ok(bindTaskIntent(totalAtCap, [source("turn-total", "q".repeat(700))]), "6,000 total characters");
  const totalOverCap = candidate(
    chosen("o".repeat(300)),
    [stated("r".repeat(500), "q".repeat(701)), ...Array.from({ length: 7 }, (_, index) => chosen(String(index).padEnd(500, "r")))],
    ["c".repeat(1_000)],
  );
  assert.equal(bindTaskIntent(totalOverCap, [source("turn-total", "q".repeat(701))]), null, "6,001 total characters");

});

test("intent: NUL, bidi controls, and unpaired surrogates fail closed without normalization", () => {
  for (const bad of ["bad\0text", "bad\u202etext", "bad\u2066text", "bad\ud800text", "bad\udcf0text"]) {
    assert.equal(parseTaskIntentCandidate(candidate(chosen(bad))), null, JSON.stringify(bad));
    assert.equal(parseTaskIntentCandidate(candidate(chosen("Outcome"), [], [bad])), null, JSON.stringify(bad));
    assert.equal(createDirectTaskIntent(bad, inputId("direct")), null, JSON.stringify(bad));
  }
  const decomposed = "Cafe e\u0301";
  const composed = decomposed.normalize("NFC");
  assert.notEqual(composed, decomposed);
  const bound = createDirectTaskIntent(decomposed, inputId("direct"));
  assert.ok(bound);
  if (bound.outcome.source === "cairn-chosen") assert.fail("expected an owner span");
  assert.equal(bound.outcome.text, decomposed);
  assert.equal(bound.outcome.owner.text, decomposed, "source bytes are preserved, not normalized");
  assert.notEqual(bound.outcome.owner.text, composed);
});

test("intent: symbols, accessors, proxies, custom prototypes, and non-enumerable fields are inert", () => {
  let getterCalls = 0;
  const accessorRow: Record<string, unknown> = { source: "cairn-chosen", ownerQuote: null };
  Object.defineProperty(accessorRow, "text", {
    enumerable: true,
    get() { getterCalls += 1; throw new Error("must not run"); },
  });
  assert.equal(parseTaskIntentCandidate(candidate(accessorRow as any)), null);
  assert.equal(getterCalls, 0);

  const proxy = new Proxy(chosen("Outcome"), {
    get() { throw new Error("proxy get must not run"); },
    ownKeys() { throw new Error("proxy ownKeys must not run"); },
    getOwnPropertyDescriptor() { throw new Error("proxy descriptor must not run"); },
    getPrototypeOf() { throw new Error("proxy prototype must not run"); },
  });
  assert.equal(parseTaskIntentCandidate(candidate(proxy)), null);

  const symbolRoot = candidate(chosen("Outcome")) as TaskIntentCandidate & { [key: symbol]: boolean };
  symbolRoot[Symbol("hidden")] = true;
  assert.equal(parseTaskIntentCandidate(symbolRoot), null);

  const custom = Object.assign(Object.create({ inherited: true }), candidate(chosen("Outcome")));
  assert.equal(parseTaskIntentCandidate(custom), null);

  const hidden = candidate(chosen("Outcome")) as any;
  Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
  assert.equal(parseTaskIntentCandidate(hidden), null);

  let arrayGetterCalls = 0;
  const requirements: unknown[] = [chosen("Requirement")];
  Object.defineProperty(requirements, "0", {
    enumerable: true,
    get() { arrayGetterCalls += 1; throw new Error("array getter must not run"); },
  });
  assert.equal(parseTaskIntentCandidate(candidate(chosen("Outcome"), requirements as any)), null);
  assert.equal(arrayGetterCalls, 0);
});

test("intent: ordinary null-prototype records are accepted, but sparse and subclassed arrays are not", () => {
  const row = Object.assign(Object.create(null), chosen("Outcome"));
  const root = Object.assign(Object.create(null), {
    version: "cairn-task-intent/v1",
    outcome: row,
    requirements: [],
    context: [],
  });
  assert.ok(parseTaskIntentCandidate(root));

  const sparse = Array(1) as unknown as TaskIntentCandidate["requirements"];
  assert.equal(parseTaskIntentCandidate(candidate(chosen("Outcome"), sparse)), null);
  class Requirements extends Array<ReturnType<typeof chosen>> {}
  assert.equal(parseTaskIntentCandidate(candidate(chosen("Outcome"), new Requirements(chosen("Requirement")))), null);
});

test("intent: invalid authenticated-source collections and bound spans fail before use", () => {
  const valid = candidate(stated("Outcome", "Owner words"));
  assert.equal(bindTaskIntent(valid, [source("duplicate", "Owner words"), source("duplicate", "Owner words")]), null);
  assert.equal(bindTaskIntent(valid, [{ ...source("turn", "Owner words"), extra: true }]), null);
  assert.equal(bindTaskIntent(valid, [{ kind: "conversation", inputId: "", text: "Owner words" }]), null);

  let sourceGetterCalls = 0;
  const hostile: Record<string, unknown> = { kind: "conversation", inputId: inputId("turn") };
  Object.defineProperty(hostile, "text", {
    enumerable: true,
    get() { sourceGetterCalls += 1; throw new Error("must not run"); },
  });
  assert.equal(bindTaskIntent(valid, [hostile]), null);
  assert.equal(sourceGetterCalls, 0);

  const bound = bindTaskIntent(valid, [source("turn", "Owner words")]);
  assert.ok(bound);
  const nonInteger = JSON.parse(JSON.stringify(bound)) as any;
  nonInteger.outcome.owner.start = 0.5;
  assert.equal(validateTaskIntent(nonInteger, [source("turn", "Owner words")]), null);
  const outOfBounds = JSON.parse(JSON.stringify(bound)) as any;
  outOfBounds.outcome.owner.end = 99;
  assert.equal(validateTaskIntent(outOfBounds, [source("turn", "Owner words")]), null);
});

test("intent: revalidation enforces latest turn, first occurrence, and the whole direct input", () => {
  const quote = "Owner words";
  const sources = [
    source("canonical-old", quote),
    source("canonical-new", `${quote} then ${quote}`),
  ];
  const bound = bindTaskIntent(candidate(stated("Outcome", quote)), sources);
  assert.ok(bound);
  if (bound.outcome.source === "cairn-chosen") assert.fail("expected an owner span");

  const olderTurn = JSON.parse(JSON.stringify(bound)) as any;
  olderTurn.outcome.owner.inputId = inputId("canonical-old");
  olderTurn.outcome.owner.start = 0;
  olderTurn.outcome.owner.end = quote.length;
  olderTurn.outcome.owner.text = quote;
  assert.equal(validateTaskIntent(olderTurn, sources), null, "an older matching turn is not canonical");

  const secondOccurrence = JSON.parse(JSON.stringify(bound)) as any;
  secondOccurrence.outcome.owner.start = quote.length + " then ".length;
  secondOccurrence.outcome.owner.end = secondOccurrence.outcome.owner.start + quote.length;
  secondOccurrence.outcome.owner.text = quote;
  assert.equal(validateTaskIntent(secondOccurrence, sources), null, "only the first span in the latest turn is canonical");

  const raw = `x${quote}`;
  const direct = createDirectTaskIntent(raw, inputId("canonical-direct"));
  assert.ok(direct);
  const partialDirect = JSON.parse(JSON.stringify(direct)) as any;
  partialDirect.outcome.owner.start = 1;
  partialDirect.outcome.owner.end = raw.length;
  partialDirect.outcome.owner.text = quote;
  assert.equal(
    validateTaskIntent(partialDirect, [source("canonical-direct", raw, "direct")]),
    null,
    "a direct source span must retain every accepted code unit",
  );
  assert.equal(
    bindTaskIntent(candidate(stated("Partial direct", quote)), [source("partial-direct", raw, "direct")]),
    null,
    "candidate binding cannot create a partial direct span either",
  );
});

test("intent: exact matching never normalizes line endings, Unicode, whitespace, or overlap", () => {
  const overlapping = bindTaskIntent(candidate(stated("Use the first pair", "aa")), [source("overlap", "aaaa")]);
  assert.ok(overlapping);
  if (overlapping.outcome.source === "cairn-chosen") assert.fail("expected an owner span");
  assert.equal(overlapping.outcome.owner.start, 0);
  assert.equal(overlapping.outcome.owner.end, 2);

  assert.equal(bindTaskIntent(candidate(stated("Keep CRLF", "a\r\nb")), [source("lf-only", "a\nb")]), null);
  assert.equal(bindTaskIntent(candidate(stated("Keep spaces", " word ")), [source("trimmed", "word")]), null);
  assert.equal(bindTaskIntent(candidate(stated("Keep normalization", "é")), [source("decomposed", "e\u0301")]), null);
});

test("intent: every forbidden bidi control is rejected while ordinary RTL text is accepted", () => {
  const forbidden = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
  for (const code of forbidden) {
    const control = String.fromCharCode(code);
    assert.equal(parseTaskIntentCandidate(candidate(chosen(`before${control}after`))), null, `U+${code.toString(16)}`);
    assert.equal(bindTaskIntent(candidate(stated("Outcome", `before${control}after`)), [source(`bidi-${code}`, `before${control}after`)]), null);
  }
  assert.ok(bindTaskIntent(candidate(chosen("שלום — مرحبا")), []));
});

test("intent: every numeric span edge is checked as a safe non-negative UTF-16 integer", () => {
  const inputs = [source("span", "Owner words")];
  const bound = bindTaskIntent(candidate(stated("Outcome", "Owner words")), inputs);
  assert.ok(bound);
  const cases: Array<[string, (value: any) => void]> = [
    ["NaN", (value) => { value.outcome.owner.start = Number.NaN; }],
    ["positive infinity", (value) => { value.outcome.owner.end = Number.POSITIVE_INFINITY; }],
    ["fractional", (value) => { value.outcome.owner.start = 0.5; }],
    ["unsafe integer", (value) => { value.outcome.owner.end = Number.MAX_SAFE_INTEGER + 1; }],
    ["negative", (value) => { value.outcome.owner.start = -1; }],
    ["negative zero", (value) => { value.outcome.owner.start = -0; }],
    ["zero length", (value) => { value.outcome.owner.end = value.outcome.owner.start; value.outcome.owner.text = ""; }],
    ["reversed", (value) => { value.outcome.owner.start = 8; value.outcome.owner.end = 3; }],
    ["wrong kind", (value) => { value.outcome.owner.kind = "direct"; }],
    ["wrong id", (value) => { value.outcome.owner.inputId = inputId("other-span"); }],
    ["extra owner key", (value) => { value.outcome.owner.extra = true; }],
  ];
  for (const [label, mutate] of cases) {
    const stored = JSON.parse(JSON.stringify(bound)) as any;
    mutate(stored);
    assert.equal(validateTaskIntent(stored, inputs), null, label);
  }
});

test("intent: proxies are rejected at every public nesting point without firing a trap", () => {
  let traps = 0;
  const handler: ProxyHandler<object> = {
    get() { traps += 1; throw new Error("get trap must stay inert"); },
    getPrototypeOf() { traps += 1; throw new Error("prototype trap must stay inert"); },
    ownKeys() { traps += 1; throw new Error("ownKeys trap must stay inert"); },
    getOwnPropertyDescriptor() { traps += 1; throw new Error("descriptor trap must stay inert"); },
  };
  const proxied = (value: object): any => new Proxy(value, handler);
  const validCandidate = candidate(stated("Outcome", "Owner words"));
  const validSources = [source("proxy-source", "Owner words")];

  assert.equal(parseTaskIntentCandidate(proxied(validCandidate)), null, "candidate root");
  assert.equal(parseTaskIntentCandidate(candidate(proxied(stated("Outcome", "Owner words")))), null, "candidate row");
  assert.equal(parseTaskIntentCandidate({ ...validCandidate, requirements: proxied([]) }), null, "requirements array");
  assert.equal(parseTaskIntentCandidate({ ...validCandidate, context: proxied([]) }), null, "context array");
  assert.equal(bindTaskIntent(validCandidate, proxied(validSources)), null, "source array");
  assert.equal(bindTaskIntent(validCandidate, [proxied(validSources[0])]), null, "source record");

  const bound = bindTaskIntent(validCandidate, validSources);
  assert.ok(bound);
  const stored = JSON.parse(JSON.stringify(bound)) as any;
  stored.outcome.owner = proxied(stored.outcome.owner);
  assert.equal(validateTaskIntent(stored, validSources), null, "owner span");

  const revoked = Proxy.revocable(validCandidate, handler);
  revoked.revoke();
  assert.equal(parseTaskIntentCandidate(revoked.proxy), null, "revoked proxy");
  assert.equal(traps, 0);
});

test("intent: cycles reject whole without recursion or partial output", () => {
  const cyclicRoot: any = candidate(chosen("Outcome"));
  cyclicRoot.outcome = cyclicRoot;
  assert.equal(parseTaskIntentCandidate(cyclicRoot), null);

  const cyclicRequirements: any[] = [];
  cyclicRequirements.push(cyclicRequirements);
  assert.equal(parseTaskIntentCandidate(candidate(chosen("Outcome"), cyclicRequirements as any)), null);
});

test("intent: source identity and search bounds are explicit and exact", () => {
  const valid = candidate(stated("Outcome", "Owner words"));
  const manyShortSources = Array.from(
    { length: 257 },
    (_, index) => source(`bounded-${index}`, index === 256 ? "Owner words" : "x"),
  );
  assert.ok(bindTaskIntent(valid, manyShortSources), "valid short-turn history is not cut off at 256 turns");

  const atTextCap = `${"x".repeat(199_989)}Owner words`;
  assert.equal(atTextCap.length, 200_000);
  assert.ok(bindTaskIntent(valid, [source("source-text-cap", atTextCap)]));
  assert.equal(bindTaskIntent(valid, [source("source-text-over", `x${atTextCap}`)]), null);

  assert.equal(bindTaskIntent(valid, [{ kind: "conversation", inputId: inputId("upper").toUpperCase(), text: "Owner words" }]), null);
  assert.equal(bindTaskIntent(valid, [{ kind: "conversation", inputId: inputId("version").replace("-4", "-3"), text: "Owner words" }]), null);
});

test("intent: distinct atomic rows may share text or a span, but exact duplicates cannot", () => {
  const sharedSpan = bindTaskIntent(candidate(
    stated("High-level outcome", "Owner words"),
    [stated("Atomic requirement", "Owner words")],
  ), [source("shared-span", "Owner words")]);
  assert.ok(sharedSpan, "different interpretations may cite the same exact span");

  const sameInterpretation = bindTaskIntent(candidate(
    stated("Same interpretation", "First words"),
    [stated("Same interpretation", "Second words")],
  ), [source("first-span", "First words"), source("second-span", "Second words")]);
  assert.ok(sameInterpretation, "the same interpretation may have distinct exact spans");
  assert.notDeepEqual(sameInterpretation.outcome.owner, sameInterpretation.requirements[0].owner);

  const sourceLabelDiffers = bindTaskIntent(candidate(
    stated("Same interpretation", "Owner words"),
    [unsure("Same interpretation", "Owner words")],
  ), [source("source-label", "Owner words")]);
  assert.ok(sourceLabelDiffers, "source is part of the duplicate key");
  assert.deepEqual(sourceLabelDiffers.outcome.owner, sourceLabelDiffers.requirements[0].owner);

  const exactRows = bindTaskIntent(candidate(
    stated("Outcome interpretation", "Owner words"),
    [stated("Requirement interpretation", "Owner words")],
  ), [source("exact-duplicate", "Owner words")]);
  assert.ok(exactRows);
  const forgedDuplicate = JSON.parse(JSON.stringify(exactRows)) as any;
  forgedDuplicate.requirements[0].text = forgedDuplicate.outcome.text;
  assert.equal(validateTaskIntent(forgedDuplicate, [source("exact-duplicate", "Owner words")]), null);
});

test("intent: canonical bytes ignore insertion order and inherited toJSON hooks", () => {
  const reverseRow: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  reverseRow.ownerQuote = null;
  reverseRow.text = "Outcome";
  reverseRow.source = "cairn-chosen";
  const reverseRoot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  reverseRoot.context = [];
  reverseRoot.requirements = [];
  reverseRoot.outcome = reverseRow;
  reverseRoot.version = "cairn-task-intent/v1";
  const reordered = bindTaskIntent(reverseRoot, []);
  const ordinary = bindTaskIntent(candidate(chosen("Outcome")), []);
  assert.ok(reordered);
  assert.ok(ordinary);
  const expected = "{\"version\":\"cairn-task-intent/v1\",\"outcome\":{\"source\":\"cairn-chosen\",\"text\":\"Outcome\",\"owner\":null},\"requirements\":[],\"context\":[]}";
  assert.equal(canonicalTaskIntent(ordinary), expected);
  assert.equal(canonicalTaskIntent(reordered), expected);
  assert.equal(taskRequestSha256(ordinary), "b80781c02d152185b7db0334c0f9c33235d54420b985a2470fec175df0750c00");
  assert.match(taskRequestSha256(ordinary) ?? "", /^[0-9a-f]{64}$/);

  const objectHook = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  const arrayHook = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
  try {
    Object.defineProperty(Object.prototype, "toJSON", { configurable: true, value: () => "poisoned object" });
    Object.defineProperty(Array.prototype, "toJSON", { configurable: true, value: () => "poisoned array" });
    assert.equal(canonicalTaskIntent(ordinary), expected);
  } finally {
    if (objectHook) Object.defineProperty(Object.prototype, "toJSON", objectHook);
    else delete (Object.prototype as { toJSON?: unknown }).toJSON;
    if (arrayHook) Object.defineProperty(Array.prototype, "toJSON", arrayHook);
    else delete (Array.prototype as { toJSON?: unknown }).toJSON;
  }
});

test("intent: the request view has only output fields and context never gains a label", () => {
  const intent = bindTaskIntent(candidate(
    stated("Outcome", "Owner words"),
    [chosen("Chosen requirement")],
    ["Owner words"],
  ), [source("view", "Owner words")]);
  assert.ok(intent);
  const view = taskRequestView(intent);
  assert.ok(view);
  assert.deepEqual(Reflect.ownKeys(view), ["outcome", "requirements"]);
  assert.deepEqual(Reflect.ownKeys(view.outcome), ["source", "text", "ownerText"]);
  assert.deepEqual(Reflect.ownKeys(view.requirements[0]), ["source", "text", "ownerText"]);
  assert.doesNotMatch(JSON.stringify(view), /context|inputId|start|end|Owner words.*Owner words/);
  assert.equal(parseTaskIntentCandidate(view), null);
  assert.equal(validateTaskIntent(view, [source("view", "Owner words")]), null);
});
