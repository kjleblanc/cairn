import { _electron as electron, expect, type ElectronApplication, type Page } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { clearStoredConnectionFiles } from "./fixtures/conductor-connection";

/**
 * Task 197's contrast floor, MEASURED.
 *
 * Why this exists. Until Task 197 the conversation surface was ~90% opaque, so
 * the colour behind lantern text was effectively fixed and reasoning about it
 * from the stylesheet was sound. Task 197 made the surface translucent over a
 * field that now has a key light — so the background behind the glyphs varies
 * by position, and no amount of reading CSS will tell you what it composites
 * to. This project has already shipped a surface measuring 2.84:1 against a
 * 4.5:1 floor (found in Task 171's whole-branch review, by inspection, not by
 * any check), and there was no contrast guard anywhere in the suite.
 *
 * Why measured and not computed. The real stack is
 *   field gradients -> backdrop blur -> translucent fill -> grain at overlay.
 * Reproducing that arithmetically would be a second implementation of the
 * browser's compositor, and it would drift from the real one silently.
 * Sampling the actual composited pixels cannot drift.
 *
 * No new dependency: Electron's own capturePage + NativeImage.getBitmap.
 */

const BODY_FLOOR = 4.5;
const LARGE_FLOOR = 3;

/**
 * Deliberately EMPTY: the floor is absolute, and every lantern element clears
 * it. This map is the escape hatch, kept only so a future finding can be
 * recorded honestly rather than silently deleted -- adding to it is a decision
 * someone has to write down, not a default.
 *
 * It did not start empty. On its first run this check found six failures, and
 * a real A/B on this branch with the pre-Task-197 values restored proved five
 * of them older than Task 197:
 *   - "Cairn's starting recommendation" used --green-deep, which is a
 *     light-dark() pair and so resolved to the LIGHT theme's #3f5c31 on
 *     permanently dark paper -- 1.14:1. The same class of bug Task 171's
 *     whole-branch review found once already, which is why this check exists.
 *   - four --lantern-soft muted body-text elements measured 4.21-4.48:1.
 * The sixth, a 1.01:1 on the "Kimi K3 / Recommended" row, was a fault in this
 * check rather than in the app: it sampled a container whose box is mostly
 * covered by a child pill painting its own background, so the modal colour was
 * the pill's fill while the ink read was the parent's. Containers like that
 * are now skipped (see `covered` below) and their children measured instead.
 *
 * Task 197 fixed the five real ones by re-pointing the dark-side green and
 * lifting the muted ink inside the lantern -- the same move the paper already
 * made for --stop. Worst measured ratio is now 4.62:1.
 */
const PRE_EXISTING_RAW = new Map<string, number>([]);
/** Matched on collapsed whitespace, so a truncation landing on a space cannot
 *  silently reclassify a recorded failure as a new one. */
function key(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
const PRE_EXISTING = new Map([...PRE_EXISTING_RAW].map(([k, v]) => [key(k), v]));
/**
 * How far a pre-existing failure may move. Task 197's translucency knowingly
 * costs muted text up to ~0.3 here, and the modal-background sample wobbles a
 * little run to run; 0.5 covers both without hiding a real collapse.
 */
const SLIP = 0.5;
/** WCAG: >=18.66px normal, or >=14px bold, counts as large text. */
function isLarge(px: number, weight: number): boolean {
  return px >= 18.66 || (weight >= 700 && px >= 14);
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(css: string): [number, number, number] {
  const nums = css.match(/[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`unreadable colour: ${css}`);
  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
}

/**
 * The modal colour of a captured region.
 *
 * A text element's box is mostly background — glyph strokes are a minority of
 * its pixels — so the most common colour IS the background. Averaging instead
 * would fold the light glyphs into the result and report a background brighter
 * than the real one, which for light-on-dark text would flatter the contrast
 * ratio and hide exactly the failure this check exists to catch.
 */
function modalColour(bgra: Buffer): [number, number, number] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < bgra.length; i += 4) {
    const b = bgra[i], g = bgra[i + 1], r = bgra[i + 2];
    // 5 bits per channel: tolerant of grain and antialiasing, still precise
    // enough that paper and ink never land in one bucket.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const hit = buckets.get(key);
    if (hit) { hit.n += 1; hit.r += r; hit.g += g; hit.b += b; }
    else buckets.set(key, { n: 1, r, g, b });
  }
  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const bucket of buckets.values()) if (bucket.n > best.n) best = bucket;
  expect(best.n, "the captured region had no pixels").toBeGreaterThan(0);
  return [best.r / best.n, best.g / best.n, best.b / best.n];
}

function scaffold(project: string): void {
  const core = pathToFileURL(join(__dirname, "..", "node_modules", "@cairn", "core", "dist", "src", "index.js")).href;
  execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { initProject } from ${JSON.stringify(core)}; initProject(process.argv[1], { name: "Contrast", what: "w", who: "me", milestone: "see it" });`,
    project,
  ]);
}

/**
 * The sweep itself, EXTRACTED by Task 260 (Slice 5) so a second scenario can
 * run the identical measurement over a different state of the same desk. Not a
 * line of the arithmetic changed; only its two callers are new.
 */
const DESK_TEXT = "p, h1, h2, h3, h4, span, strong, button, summary, label";
/** The conversation adds machine evidence, which is the point of measuring it:
 *  mono on its own raised surface is a different pairing from prose on paper.
 *  The disconnected sweep deliberately keeps the ORIGINAL element list, so this
 *  slice cannot turn an unmigrated surface red by widening what it looks at. */
const CONVERSATION_TEXT = `${DESK_TEXT}, code, td, th, li`;

async function sweep(
  app: ElectronApplication, win: Page, rootSelector: string, label: string,
  elements: string = DESK_TEXT,
): Promise<void> {
  const root = win.locator(rootSelector);
  const samples = await root.locator(elements).filter({ hasText: /\S/ }).all();
  expect(samples.length, "no desk text was found to measure").toBeGreaterThan(3);

  const failures: string[] = [];
  let measured = 0;
  let worst = { ratio: Infinity, text: "", floor: BODY_FLOOR };

  for (const sample of samples) {
    if (!(await sample.isVisible())) continue;
    const box = await sample.boundingBox();
    if (!box || box.width < 8 || box.height < 8) continue;

    const style = await sample.evaluate((el) => {
      const s = getComputedStyle(el);
      // A container whose box is largely covered by a child that paints its
      // OWN background is not measurable this way: the modal colour would be
      // that child's fill while the colour read here is the parent's ink, and
      // the two never actually meet on screen. (This produced a spurious
      // 1.01:1 on the "Kimi K3 / Recommended" row, whose tag is a light pill
      // carrying its own dark ink.) Such elements are skipped; their children
      // are separately present in the sample set and get measured properly.
      const covered = Array.from(el.querySelectorAll("*")).some((child) => {
        const c = getComputedStyle(child as Element).backgroundColor;
        return c !== "rgba(0, 0, 0, 0)" && c !== "transparent";
      });
      return { color: s.color, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) || 400, covered };
    });
    if (style.covered) continue;
    // A fully transparent colour is a decorative or spacing element.
    if (/rgba?\([^)]*,\s*0\s*\)/.test(style.color)) continue;

    const rect = {
      x: Math.round(box.x), y: Math.round(box.y),
      width: Math.round(box.width), height: Math.round(box.height),
    };
    const shot = await app.evaluate(async ({ BrowserWindow }, r) => {
      const target = BrowserWindow.getAllWindows()[0];
      const image = await target.webContents.capturePage(r);
      return image.getBitmap().toString("base64");
    }, rect);
    const bgra = Buffer.from(shot, "base64");
    if (bgra.length < 16) continue;

    const [br, bg, bb] = modalColour(bgra);
    const [tr, tg, tb] = parseRgb(style.color);
    const ratio = contrast(luminance(tr, tg, tb), luminance(br, bg, bb));
    const floor = isLarge(style.size, style.weight) ? LARGE_FLOOR : BODY_FLOOR;
    measured += 1;

    const text = ((await sample.textContent()) ?? "").trim().slice(0, 42);
    if (ratio < worst.ratio) worst = { ratio, text, floor };
    if (ratio >= floor) continue;

    const where =
      `${ratio.toFixed(2)}:1 (needs ${floor}:1) — ${style.size.toFixed(1)}px/${style.weight} ` +
      `"${text}" ink ${style.color} on measured rgb(${br.toFixed(0)} ${bg.toFixed(0)} ${bb.toFixed(0)})`;
    const known = PRE_EXISTING.get(key(text));
    if (known === undefined) {
      failures.push(`NEW: ${where}`);
    } else if (ratio < known - SLIP) {
      failures.push(`WORSE than its ${known.toFixed(2)}:1 baseline by ${(known - ratio).toFixed(2)} — ${where}`);
    }
  }

  expect(measured, "nothing was actually measured, so this check proved nothing").toBeGreaterThan(3);
  // eslint-disable-next-line no-console -- the report cites these numbers
  console.log(`contrast (${label}): ${measured} elements measured, worst ${worst.ratio.toFixed(2)}:1 ` +
    `(floor ${worst.floor}) on "${worst.text}"`);
  expect(
    failures,
    `the contrast ratchet moved the wrong way in "${label}" — either an element that ` +
    "used to clear the floor now does not, or one already below it collapsed " +
    `further:\n  ${failures.join("\n  ")}`,
  ).toEqual([]);
}

/*
 * REPOINTED by Task 259 (Slice 4). This swept `.chat-column-villager`, the
 * conversation panel floating over the pond. That panel is retired: the
 * conversation is now warm paper on the desk, and the desk grew a header and
 * an activity capsule that carry state in words.
 *
 * The root moved OUT to `.workspace-stage`, so the sweep now measures the
 * whole composition rather than one panel inside it — the same conversation
 * elements as before, plus the two new chrome rows. Narrowing it back to the
 * conversation would leave the capsule, which is where DONE, STOPPED and a
 * waiting decision are actually announced, unmeasured.
 */
test("the desk's text clears the contrast floor against the field it sits on", async () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-contrast-"));
  scaffold(project);
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = project;

  const app = await electron.launch({ args: ["."], env });
  try {
    const win = await app.firstWindow();
    // Wide: the widest viewport puts the most of the key light's falloff
    // behind the surface, which is the worst case this check is for.
    await win.setViewportSize({ width: 1320, height: 980 });
    const desk = win.locator(".workspace-stage");
    await expect(desk).toBeVisible({ timeout: 20_000 });
    await expect(win.locator(".rp-conversation")).toBeVisible({ timeout: 20_000 });
    /* WHAT THIS SCENARIO DOES NOT REACH — and what the one below now does.
       This lane runs with `CAIRN_MOCK` and no conductor connection, so the
       conversation shows its connect card rather than a composer. Task 259
       recorded that as a gap: the sweep had never measured a Cairn turn, an
       owner note or a composer, because reaching one needs a connected
       conductor fixture. Task 260 (Slice 5) adds exactly that below, against
       the same local fake `conductor.spec.ts` uses — no provider, no
       credential, no network beyond loopback. The DECISION surfaces (task card,
       dispatch panel, question card) are still unmeasured and are Slice 6's. */

    // Let any entrance settle, or the capture catches a surface that is still
    // moving and still part-transparent.
    await win.waitForTimeout(1200);
    await sweep(app, win, ".workspace-stage", "disconnected desk");
  } finally {
    await app.close();
  }
});

/*
 * Task 260 (Slice 5) — THE CONNECTED CONVERSATION, MEASURED.
 *
 * The gap Task 259 wrote down and could not close. Everything this slice
 * redrew — Cairn's open prose, the owner's apricot note, the machine-evidence
 * surfaces inside that prose, the composer and its two actions, the top bar —
 * exists only once a conductor is connected, so none of it had ever been on
 * screen while this file was measuring.
 *
 * The connection is the local fixture body, reached the same visible way an
 * owner reaches a custom provider: no real provider, no credential of the
 * owner's, no paid call, and nothing leaving the machine. The stored
 * connection lands in the throwaway profile `isolated-profile.ts` installs —
 * `conductor-connection.ts` refuses to resolve a path at all outside it — so
 * the owner's own saved connection is unreachable from here.
 */
/*
 * Task 263 (Slice 6) WIDENED this scenario rather than adding a third: the
 * decision surfaces — the proposal, its concern, its attributed request rows
 * and its gated primary control — are now driven onto the paper before the
 * sweep runs, so they are measured with everything else.
 */
test("the connected conversation's own text clears the contrast floor", async () => {
  const fixturePath = pathToFileURL(join(__dirname, "fixtures", "fake-conductor.mjs")).href;
  const fixture = (await import(fixturePath)) as {
    start: () => Promise<{ url: string; close: () => Promise<void> }>;
  };
  const server = await fixture.start();

  const project = mkdtempSync(join(tmpdir(), "cairn-contrast-connected-"));
  scaffold(project);
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.CAIRN_MOCK = "1";
  env.CAIRN_OPEN = project;

  const app = await electron.launch({ args: ["."], env });
  try {
    const win = await app.firstWindow();
    await win.setViewportSize({ width: 1320, height: 980 });
    await expect(win.locator(".workspace-stage")).toBeVisible({ timeout: 20_000 });

    // The same route an owner takes to a local provider: a different brain,
    // Custom, the fixture's URL, and both standing-authorization choices made
    // explicitly rather than inferred from filled fields.
    const card = win.locator(".card", { hasText: "connect cairn's brain" });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await win.getByRole("button", { name: "Choose a different brain" }).click();
    await win.getByRole("button", { name: "Custom…" }).click();
    await card.locator('input[type="text"]').first().fill(server.url);
    await win.getByPlaceholder("e.g. moonshotai/kimi-k3").fill("fixture-model");
    await win.getByPlaceholder("Stored encrypted; shown never again").fill("sk-contrast-fixture");
    const checkboxes = card.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await win.getByRole("button", { name: "Connect" }).click();
    await expect(card).not.toBeVisible({ timeout: 20_000 });

    // One exchange, so an owner note and a Cairn turn are both on the paper.
    // The scripted reply carries an absolute Windows path in inline code, a
    // fenced command far wider than the measure, a table and an unbroken
    // token — the four things that overflow a conversation.
    await win.getByPlaceholder("Talk with Cairn").fill("Show me the markdown-containment sample.");
    await win.getByRole("button", { name: "Send", exact: true }).click({ noWaitAfter: true });
    await expect(win.locator(".bubble-owner")).toBeVisible({ timeout: 20_000 });
    await expect(win.locator(".bubble-cairn .md-code")).toBeVisible({ timeout: 30_000 });
    await expect(win.locator(".chat-composer")).toBeVisible({ timeout: 20_000 });
    await win.waitForTimeout(1200);

    // CONTAINMENT, measured on the real composition rather than argued from the
    // stylesheet: wide machine evidence scrolls inside its own frame, and the
    // page itself never scrolls sideways.
    const containment = await win.evaluate(() => {
      const pre = document.querySelector<HTMLElement>(".rp-conversation .md-code");
      const paper = document.querySelector<HTMLElement>(".rp-conversation");
      const table = document.querySelector<HTMLElement>(".rp-conversation .md-table-wrap");
      return {
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        paperOverflows: paper ? paper.scrollWidth > paper.clientWidth : true,
        preScrollsItself: pre ? pre.scrollWidth > pre.clientWidth : false,
        preOverflowX: pre ? getComputedStyle(pre).overflowX : "missing",
        tableOverflowX: table ? getComputedStyle(table).overflowX : "missing",
      };
    });
    expect(containment.pageOverflows, "the page itself scrolls sideways").toBe(false);
    expect(containment.paperOverflows, "wide machine evidence widened the paper").toBe(false);
    expect(containment.preOverflowX, "a fenced command does not scroll inside its own frame").toBe("auto");
    expect(containment.tableOverflowX, "a wide table does not scroll inside its own frame").toBe("auto");
    expect(containment.preScrollsItself,
      "the sample was not actually wider than the measure, so containment proved nothing").toBe(true);

    /*
     * KEYBOARD, measured by TABBING. A programmatic `.focus()` sets `:focus`
     * but never `:focus-visible`, so testing that way measures a ring users
     * never actually see. The constitution's ring is 3 px at a 2 px offset.
     */
    const composer = win.locator(".chat-composer");
    // An unsent draft, so Send is enabled and therefore IN the tab order. A
    // disabled control is skipped, which is correct behaviour and is why the
    // first version of this walk could not reach it.
    await win.getByPlaceholder("Talk with Cairn").fill("an unsent draft");
    await win.getByPlaceholder("Talk with Cairn").focus();
    const rings: { name: string; ring: { style: string; width: string; offset: string } }[] = [];
    for (const name of ["New conversation", "Send"]) {
      await win.keyboard.press("Tab");
      const control = composer.getByRole("button", { name, exact: name === "Send" });
      await expect(control).toBeFocused();
      rings.push({
        name,
        ring: await control.evaluate((element) => {
          const s = getComputedStyle(element);
          return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset };
        }),
      });
    }
    for (const { name, ring } of rings) {
      expect(ring, `${name} has no drawn focus ring`)
        .toEqual({ style: "solid", width: "3px", offset: "2px" });
    }
    // Shift+Tab walks back to where it started, so nothing is a one-way trap.
    await win.keyboard.press("Shift+Tab");
    await win.keyboard.press("Shift+Tab");
    await expect(win.getByPlaceholder("Talk with Cairn")).toBeFocused();

    /*
     * Task 263 (Slice 6) — THE DECISION SURFACES, ON SCREEN AND MEASURED.
     *
     * Tasks 259 and 260 both wrote down that the proposal's primary control
     * "looks low-contrast and is unmeasured", and Task 260 said the right fix
     * was to WIDEN this scenario rather than write a third. This is that.
     *
     * The fixture answers anything containing "title" with a proposal that
     * carries a concern, which is the richest state in the family: the folio,
     * the attention rule down its edge, a concern row with its own Set aside,
     * the attributed request rows behind the native fold — and Review DISABLED,
     * because an unresolved concern gates it. That last one is the state the
     * retired rule faded to `opacity: .68`, on a teal fill, never measured.
     */
    await win.getByPlaceholder("Talk with Cairn").fill("Please change the page title for me.");
    await win.getByRole("button", { name: "Send", exact: true }).click({ noWaitAfter: true });
    await expect(win.locator(".task-card")).toBeVisible({ timeout: 30_000 });
    await expect(win.locator(".task-risk")).toBeVisible({ timeout: 20_000 });

    // Open the fold, so the attributed request rows are measured too rather
    // than being hidden behind a summary the sweep would skip.
    await win.locator(".task-card-details > summary").click();
    await expect(win.locator(".task-intent-row").first()).toBeVisible({ timeout: 10_000 });
    await win.waitForTimeout(600);

    // The gated control really is disabled, so the sweep below measures the
    // inactive state rather than proving nothing.
    await expect(win.locator(".task-card-actions .pill-primary")).toBeDisabled();

    // The proposal does not travel: it holds Review and a Set aside, which is
    // exactly the container the constitution forbids transforming.
    const proposalMotion = await win.locator(".task-card").evaluate((element) => {
      const style = getComputedStyle(element);
      return { animation: style.animationName, transform: style.transform };
    });
    expect(proposalMotion.animation, "the proposal still animates on arrival").toBe("none");
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"], "the proposal is drawn under a transform")
      .toContain(proposalMotion.transform);

    // Put the draft back and leave Send DISABLED for the sweep below. That is
    // the state a composer is in most of the time, and measuring it is what
    // caught a 2.45:1 label: `opacity` fades a control's words and its ground
    // together, and an inactive control is still read.
    await win.getByPlaceholder("Talk with Cairn").fill("");
    await expect(composer.getByRole("button", { name: "Send", exact: true })).toBeDisabled();

    // Every interactive target the conversation itself owns clears 44 x 44,
    // measured from real bounding boxes rather than from the stylesheet.
    const small = await win.locator(".rp-conversation").evaluate((root) => {
      const out: string[] = [];
      for (const control of root.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select")) {
        const box = control.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) continue;
        if (box.width < 44 || box.height < 44) {
          out.push(`${(control.textContent ?? control.getAttribute("aria-label") ?? control.tagName).trim().slice(0, 30)}` +
            ` ${box.width.toFixed(0)}x${box.height.toFixed(0)}`);
        }
      }
      return out;
    });
    expect(small, "a conversation control is below the 44 x 44 target floor").toEqual([]);

    await sweep(app, win, ".workspace-stage", "connected conversation", CONVERSATION_TEXT);
  } finally {
    await app.close();
    clearStoredConnectionFiles();
    await server.close();
  }
});
