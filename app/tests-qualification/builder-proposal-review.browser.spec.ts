import { expect, test } from "@playwright/test";

test("the stable lab renders two inert, unfocusable proposal cards", async ({ page }) => {
  const openedPages: string[] = [];
  const allRequests: string[] = [];
  page.context().on("page", (openedPage) => openedPages.push(openedPage.url()));
  page.on("request", (request) => allRequests.push(request.url()));
  await page.goto("/lab/builderproposal.html");

  const cards = page.locator(".builder-proposal-review");
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Builder proposal — not applied" })).toHaveCount(2);
  await expect(page.getByText(
    "Proposal only — Cairn has not applied, executed, published, or verified this suggestion.",
  )).toHaveCount(2);
  await expect(page.getByText("examples/synthetic/greeting.ts", { exact: true })).toBeVisible();
  await expect(page.getByText("Untrusted suggestion", { exact: true })).toBeVisible();

  const forbidden = cards.locator([
    "a", "button", "input", "textarea", "select", "option", "form", "label", "details", "summary",
    "iframe", "object", "embed", "audio", "video", "canvas", "img", "svg", "style", "script",
    "[href]", "[src]", "[for]", "[role]", "[tabindex]", "[contenteditable=true]",
  ].join(","));
  await expect(forbidden).toHaveCount(0);

  const startingUrl = page.url();
  const startingPages = page.context().pages().length;
  const requestCountBeforeInteraction = allRequests.length;
  const suggestedTarget = page.getByText(
    "The synthetic reference named Garden greeting format; nothing will open it.",
    { exact: true },
  );
  await suggestedTarget.dblclick();
  await suggestedTarget.click();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  expect(page.url()).toBe(startingUrl);
  expect(page.context().pages()).toHaveLength(startingPages);
  expect(openedPages).toEqual([]);
  expect(allRequests).toHaveLength(requestCountBeforeInteraction);
  expect(await cards.evaluateAll((nodes) => nodes.every((node) => !node.contains(document.activeElement)))).toBe(true);

  const allowedLabRequest = (rawUrl: string): boolean => {
    const url = new URL(rawUrl);
    if (url.origin !== "http://127.0.0.1:7398") return false;
    return [
      /^\/lab\/builderproposal(?:\.html|\.tsx|-fixtures\.ts|\.css)$/u,
      /^\/src\/renderer\/(?:tokens\.css|app\.css|components\/BuilderProposalReview\.tsx)$/u,
      /^\/src\/shared\/builder-proposal-review\.ts$/u,
      /^\/@vite\/client$/u,
      /^\/@react-refresh$/u,
      /^\/node_modules\//u,
      /^\/@fs\/.*\/node_modules\//u,
    ].some((pattern) => pattern.test(url.pathname));
  };
  expect(allRequests.filter((requestUrl) => !allowedLabRequest(requestUrl))).toEqual([]);

  const wide = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    border: getComputedStyle(document.querySelector(".builder-proposal-review")!).borderLeftWidth,
  }));
  expect(wide.width).toBe(1280);
  expect(wide.scrollWidth).toBeLessThanOrEqual(wide.width);
  expect(wide.border).toBe("5px");

  await page.setViewportSize({ width: 600, height: 900 });
  const compact = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector(".builder-proposal-comparison")!).gridTemplateColumns,
  }));
  expect(compact.width).toBe(600);
  expect(compact.scrollWidth).toBeLessThanOrEqual(compact.width);
  expect(compact.columns.trim().split(/\s+/u)).toHaveLength(1);

  await page.screenshot({ path: "test-results/task229-builder-proposal-review.png", fullPage: true });
});
