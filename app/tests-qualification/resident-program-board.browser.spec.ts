import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Task 255 - the resident-program board, rendered.
 *
 * The unit suite proves the token and source contract. This proves the page
 * a human will actually look at: that it contains itself at every supported
 * size, that the theme choice beats the operating system in BOTH directions,
 * that reduced motion lands on the identical rendered state, and that keyboard
 * traversal reaches nothing that could act.
 *
 * System is resolved through browser colour-scheme emulation. The owner's own
 * operating-system setting is never touched.
 */

const SHOTS = "test-results/task255-board";

/** The sizes the plan names, plus the below-minimum containment stress. */
const VIEWPORTS = [
  { name: "1320x980-wide", width: 1320, height: 980 },
  { name: "0760x620-minimum", width: 760, height: 620 },
  { name: "0540x900-below-minimum-stress", width: 540, height: 900 },
  { name: "0390x700-phone", width: 390, height: 700 },
];

async function chooseTheme(page: Page, choice: "System" | "Light" | "Dark"): Promise<void> {
  // Click the board's own control rather than setting the attribute directly,
  // so the qualification exercises the same path the owner would.
  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: choice, exact: true }).click();
}

async function containment(page: Page): Promise<{ inner: number; scroll: number }> {
  // clientWidth, not innerWidth: innerWidth includes the scrollbar gutter, so
  // comparing against it silently tolerates a scrollbar's worth of real
  // horizontal overflow.
  return page.evaluate(() => ({
    inner: document.documentElement.clientWidth,
    viewport: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
}

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true });
});

test("the board contains itself at every size, in every theme", async ({ page }) => {
  const requests: string[] = [];
  const opened: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.context().on("page", (other) => opened.push(other.url()));

  await page.goto("/lab/resident-program.html");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("resident program");

  // Every combination the owner is being asked to judge, captured for the gate.
  const cases = [
    { theme: "System" as const, emulate: "light" as const, label: "system-on-a-light-os" },
    { theme: "System" as const, emulate: "dark" as const, label: "system-on-a-dark-os" },
    // The explicit choice is tested against the OPPOSITE operating system, which
    // is the only way to prove the override actually wins.
    { theme: "Light" as const, emulate: "dark" as const, label: "explicit-light-on-a-dark-os" },
    { theme: "Dark" as const, emulate: "light" as const, label: "explicit-dark-on-a-light-os" },
  ];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const entry of cases) {
      await page.emulateMedia({ colorScheme: entry.emulate });
      await chooseTheme(page, entry.theme);

      // The choice really took effect, in the right direction.
      const resolved = await page.evaluate(() => ({
        attribute: document.documentElement.getAttribute("data-theme"),
        field: getComputedStyle(document.body).backgroundColor,
        ink: getComputedStyle(document.body).color,
      }));
      if (entry.theme === "System") expect(resolved.attribute).toBeNull();
      else expect(resolved.attribute).toBe(entry.theme.toLowerCase());

      const wantsDark = entry.theme === "Dark" || (entry.theme === "System" && entry.emulate === "dark");
      const [r, g, b] = /(\d+), (\d+), (\d+)/u.exec(resolved.field)!.slice(1).map(Number);
      const bright = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (wantsDark) expect(bright, `${entry.label} should render dark`).toBeLessThan(90);
      else expect(bright, `${entry.label} should render light`).toBeGreaterThan(150);

      // Nothing may push the page sideways at any supported size, and 540 px
      // is a stress test rather than a supported one - it must still contain.
      const box = await containment(page);
      expect(box.viewport).toBe(viewport.width);
      expect(box.scroll, `${viewport.name} / ${entry.label} overflows horizontally`)
        .toBeLessThanOrEqual(box.inner);

      await page.screenshot({
        path: `${SHOTS}/${viewport.name}--${entry.label}.png`,
        fullPage: true,
      });
    }
  }

  // Everything the page loaded came from this local lab server.
  const strayOrigins = [...new Set(requests.map((url) => new URL(url).origin))]
    .filter((origin) => origin !== "http://127.0.0.1:7399");
  expect(strayOrigins, "the board must load no remote asset").toEqual([]);
  expect(opened, "the board must not open a window").toEqual([]);
});

test("reduced motion reaches the identical rendered state", async ({ page }) => {
  await page.setViewportSize({ width: 1320, height: 980 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/lab/resident-program.html");
  await chooseTheme(page, "Light");

  const stage = page.locator(".rp-motion-stage");
  const art = page.locator(".rp-motion-stage svg");
  const replay = page.getByRole("button", { name: "Play the arrival once" });
  await stage.scrollIntoViewIfNeeded();

  /**
   * Measured as the SEMANTIC end state - position and opacity - rather than by
   * comparing PNG bytes. A settled `transform: matrix(1,0,0,1,0,0)` and a
   * `transform: none` put the element in the identical place, but the first
   * promotes it to its own compositing layer, so their antialiasing differs by
   * a few bytes. Comparing pixels would fail on a difference that is not there.
   */
  const restState = async () =>
    art.evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        // matrix(1,0,0,1,0,0) and "none" are the same resting position.
        moved: style.transform !== "none" && style.transform !== "matrix(1, 0, 0, 1, 0, 0)",
        offset: style.transform,
        opacity: Number(style.opacity),
        left: Math.round(box.left),
        top: Math.round(box.top),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    });

  // With motion allowed: play it, let the one finite animation finish.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await replay.click();
  await page.waitForTimeout(700);
  const settled = await restState();
  expect(settled.moved, "the arrival must finish at rest").toBe(false);
  expect(settled.opacity).toBe(1);
  await stage.screenshot({ path: `${SHOTS}/motion-allowed-end-state.png` });

  // Mid-flight it is genuinely somewhere else - otherwise "the end states match"
  // would be true only because nothing ever moved.
  await replay.click();
  await page.waitForTimeout(60);
  const midFlight = await restState();
  expect(midFlight.moved, "the arrival must actually move something").toBe(true);
  expect(midFlight.opacity, "the arrival must actually fade something in").toBeLessThan(1);
  await stage.screenshot({ path: `${SHOTS}/motion-allowed-mid-flight.png` });
  await page.waitForTimeout(700);

  // With reduced motion: the travel is skipped and the resting state is the same.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await replay.click();
  await page.waitForTimeout(60);
  const reduced = await restState();
  await stage.screenshot({ path: `${SHOTS}/motion-reduced-end-state.png` });
  expect(reduced.moved, "reduced motion must land at rest immediately").toBe(false);
  expect(reduced.opacity).toBe(1);
  expect(
    { left: reduced.left, top: reduced.top, width: reduced.width, height: reduced.height },
    "reduced motion must land on the identical semantic end state",
  ).toEqual({ left: settled.left, top: settled.top, width: settled.width, height: settled.height });

  // And no animation is left running anywhere on the page.
  const running = await page.evaluate(() =>
    document.getAnimations().filter((animation) => animation.playState === "running").length);
  expect(running, "nothing may still be moving once the page has settled").toBe(0);
});

test("keyboard traversal reaches only harmless controls", async ({ page }) => {
  await page.setViewportSize({ width: 1320, height: 980 });
  await page.goto("/lab/resident-program.html");

  const reached: string[] = [];
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => {
      const node = document.activeElement as HTMLElement | null;
      if (!node || node === document.body) return null;
      // Identify by aria-label, then by class for containers, and only fall
      // back to text for the plain buttons - a text slice alone is brittle.
      const cls = typeof node.className === "string" ? node.className.split(" ")[0] : "";
      const label = node.getAttribute("aria-label")
        ?? (node.tagName === "DIV" ? `.${cls}` : (node.textContent ?? "").trim().replace(/\s+/gu, " ").slice(0, 24));
      return `${node.tagName.toLowerCase()}:${label}`;
    });
    if (active && !reached.includes(active)) reached.push(active);
  }

  // The demonstration controls ARE real controls on purpose - the board has to
  // show genuine hover, focus, busy and disabled states, and a drawn imitation
  // could not. What matters is that none of them does anything, which the two
  // assertions below prove. `div:` is the scrolling transcript, which Chromium
  // makes focusable so a keyboard user can scroll it; that is correct.
  expect(reached.sort()).toEqual([
    "button:Dark",
    "button:Light",
    "button:Play the arrival once",
    "button:Primary",
    "button:Quiet",
    "button:Send",
    "button:Busy…",
    "button:System",
    "div:.rp-transcript",
    "input:Sample field",
  ].sort());

  // Clicking every reachable control changes nothing beyond the page's own
  // local view state: no navigation, no new window, no request.
  const before = { url: page.url(), pages: page.context().pages().length };
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const controls = page.locator("button, input");
  for (let i = 0; i < (await controls.count()); i++) {
    await controls.nth(i).click({ trial: false, force: true });
  }
  expect(page.url()).toBe(before.url);
  expect(page.context().pages()).toHaveLength(before.pages);
  expect(requests, "no control on the board may cause a request").toEqual([]);

  // The drawn approval pair is not a control and cannot be reached or clicked.
  const inert = page.locator(".rp-btn-inert");
  await expect(inert).toHaveCount(2);
  expect(await inert.evaluateAll((nodes) => nodes.every((node) => node.tagName.toLowerCase() === "span"))).toBe(true);
  expect(await inert.evaluateAll((nodes) => nodes.every((node) => !node.hasAttribute("tabindex")))).toBe(true);

  // Focus is visible and drawn, not left to the browser default. It has to be
  // REACHED by keyboard: a programmatic .focus() sets :focus but never
  // :focus-visible, so testing that way would measure a ring users never see.
  await page.reload();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const node = document.activeElement as HTMLElement;
    const style = getComputedStyle(node);
    return {
      name: (node.textContent ?? "").trim(),
      width: style.outlineWidth,
      style: style.outlineStyle,
      offset: style.outlineOffset,
      colour: style.outlineColor,
    };
  });
  expect(focused.name).toBe("System");
  expect(focused.style).toBe("solid");
  expect(Number.parseFloat(focused.width)).toBeGreaterThanOrEqual(3);
  expect(Number.parseFloat(focused.offset)).toBeGreaterThan(0);
});

test("every control meets the 44 px target, and the program announces nothing", async ({ page }) => {
  await page.setViewportSize({ width: 1320, height: 980 });
  await page.goto("/lab/resident-program.html");

  const small = await page.locator("button, input").evaluateAll((nodes) =>
    nodes
      .map((node) => ({ label: (node.textContent ?? "").trim() || node.tagName, box: node.getBoundingClientRect() }))
      .filter((entry) => entry.box.height < 44 || entry.box.width < 44)
      .map((entry) => `${entry.label} ${Math.round(entry.box.width)}x${Math.round(entry.box.height)}`));
  expect(small, "every interactive target must be at least 44x44").toEqual([]);

  const programs = page.locator("svg[data-rp-program]");
  await expect(programs.first()).toBeVisible();
  expect(await programs.count()).toBeGreaterThanOrEqual(9);
  expect(await programs.evaluateAll((nodes) => nodes.every((node) =>
    node.getAttribute("aria-hidden") === "true"
    && node.getAttribute("focusable") === "false"
    && !node.querySelector("title")
    && !node.hasAttribute("aria-label")))).toBe(true);

  // All nine states are drawn, and each one's literal words are on the page.
  for (const [state, truth] of [
    ["ready", "Ready"],
    ["thinking", "Thinking"],
    ["needs-decision", "Needs decision"],
    ["working", "Working · 1 approved task"],
    ["checking", "Checking"],
    ["done", "Verified done"],
    ["stopped", "Stopped"],
    ["error", "Error"],
    ["disconnected", "Not connected"],
  ]) {
    const card = page.locator(`[data-rp-state="${state}"]`);
    await expect(card).toHaveCount(1);
    // Scoped to the truth badge: the card's heading can repeat the same word,
    // and it is the badge that has to carry the literal status.
    await expect(card.locator(".rp-state-truth").getByText(truth, { exact: true })).toBeVisible();
  }

  // The size row is drawn at true size: the 88 px entry really is 88 px of pane.
  const paneHeights = await page.locator(".rp-sizes svg").evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      const view = node.getAttribute("viewBox")!.split(" ").map(Number);
      return Math.round((box.height / view[3]) * 63.5);
    }));
  expect(paneHeights).toEqual([28, 34, 64, 88]);
});
