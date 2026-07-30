# Task 134 brief: a shots page in the lab — see UI changes without opening the app

**Lane:** A (main checkout)

## Requested visible outcome

The owner's words: "How about we just have you screenshot and show me changes
instead since it's mainly ui/layout work" — and the chat image-gallery cards
failed twice (rendered as raw code blocks, owner's screenshots as evidence).
So the review surface moves into the product's own lab: a **shots page**
served by the lab dev server where each UI task gets an entry — captioned
before/after (or after-only) screenshots — viewable at
`http://localhost:7100/shots.html` (or the lab's own port 7410).

This is the first entry of a durable routine: every future UI task drops its
settled screenshots into `app/lab/shots/` with a manifest row, and the owner
reviews them on this page instead of opening the app.

## Boundary of intent

- **Lab-only.** Nothing in the shipped Electron bundle changes; the page is a
  sibling of `concepts.html` and `lookboard.html`. `build:lab` gains one
  rollup input, nothing else.
- **Generated content stays untracked.** `app/lab/shots/` (images + manifest)
  is gitignored like `design/` — the tracked files are the page itself, the
  gitignore line, the lab config input, and the task records.
- **The lab root keeps rendering the app mock** exactly as today; the shots
  page is a separate path.
- AI decision (recorded here per contract v0.5.0): the page is a static
  viewer reading a tiny `manifest.json` — no framework, matching the lab's
  plain-HTML siblings.
- The other lanes' work is never staged or touched.

## Checks (exact commands; outputs cited in the report)

- `cd app && npm.cmd run typecheck` — green.
- `cd app && npm.cmd run build:lab` — green and emits `shots.html`.
- `cd app && npm.cmd run lab` (temporary, then stopped): `curl` returns HTTP
  200 for `/shots.html`, for the manifest, and for each referenced image.
- An isolated screenshot of the rendered shots page (Playwright against the
  dev server) inspected by me, saved untracked under `design/attachments/`.

## DONE / STOPPED

- **DONE:** the shots page renders the Task 130 overlay screenshots as its
  first entry over the lab server; all checks green; commit contains only the
  page, config, gitignore, and records.
- **STOPPED:** the page cannot be added without touching shipped code or
  tracking generated images.
