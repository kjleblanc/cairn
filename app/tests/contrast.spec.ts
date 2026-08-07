import { _electron as electron, expect } from "@playwright/test";
import { test } from "./fixtures/isolated-profile";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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

test("lantern text clears the contrast floor against the lit field it now sits on", async () => {
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
    const lantern = win.locator(".chat-column-villager");
    await expect(lantern).toBeVisible({ timeout: 20_000 });
    // Let the entrance animation settle, or the capture catches it mid-rise
    // and samples a surface that is still moving and still part-transparent.
    await win.waitForTimeout(1200);

    const samples = await lantern.locator("p, h1, h2, h3, h4, span, strong, button, summary, label")
      .filter({ hasText: /\S/ }).all();
    expect(samples.length, "no lantern text was found to measure").toBeGreaterThan(3);

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
    // eslint-disable-next-line no-console -- the report cites this number
    console.log(`contrast: ${measured} elements measured, worst ${worst.ratio.toFixed(2)}:1 ` +
      `(floor ${worst.floor}) on "${worst.text}"`);
    expect(
      failures,
      "the contrast ratchet moved the wrong way — either a lantern element that " +
      "used to clear the floor now does not, or one already below it collapsed " +
      `further:\n  ${failures.join("\n  ")}`,
    ).toEqual([]);
  } finally {
    await app.close();
  }
});
