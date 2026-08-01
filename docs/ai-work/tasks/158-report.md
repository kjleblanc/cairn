# Task 158 — Remove projects from the remembered-projects list

Continuation of the stopped envelope runs 148 (RECORD_VERIFICATION_FAILED) and
150 (MODEL_REPORTED_STOPPED). Their retained product edits were the starting
point; everything was re-verified from scratch in the owner's real
environment, per the Task 150 brief's instruction to treat the workers'
accounts as design hints only.

## What actually changed (this task's paths, exact)

- `app/src/renderer/screens/Picker.tsx` — retained worker edit, verified:
  every healthy remembered project's card now carries a visible
  **Remove from this list** control. The card is no longer one giant button:
  the project name/milestone/last-opened block remains the open button, and
  the stone badge plus a quiet remove pill sit on the right. Broken entries
  already had the same control (`forget()` → `cairn.projectForget(dir)`,
  which edits only the app's own `projects.json`), so every remembered
  project — healthy or broken — now offers removal. Nothing is deleted,
  moved, or transformed on disk.
- `app/tests/projects.spec.ts` — two changes:
  1. Retained worker edit, verified: a new scenario, "a healthy project can
     be removed without changing its folder, then opened again" — removes
     Beta through the real UI, asserts the registry no longer lists it,
     asserts the folder's `AGENTS.md` is byte-identical before and after,
     reopens the untouched folder through `window.cairn.projectOpen` (the
     same API the folder picker uses), and asserts it returns as the most
     recent entry with its contract still byte-identical.
  2. **Repair inside this task** (disclosed): the never-before-run suite
     contained one latent failure — the older broken-entry scenario located
     its remove button with an unscoped
     `win.getByRole("button", { name: "Remove from this list" })`, which now
     matches **two** buttons (the broken card's and, new, the healthy card's)
     and fails Playwright strict mode. Repaired by scoping the locator to the
     broken card (`brokenCard.getByRole(...)`), which is exactly what that
     scenario means to exercise. One comment line records why.

No other files were written by this task.

## Checks run (exact commands, real results — all from `app/`, Node v24.12.0)

- `npm run typecheck` — **passed**, no diagnostics.
- `npm run test:unit` — **145/145 passed** (includes the concurrent lane's 4
  new faces tests; the picker change has no unit surface of its own).
- `npm run build:vite` — **passed** (copy-assets + main + preload + renderer;
  renderer `✓ built in 766ms`).
- `npx playwright test tests/projects.spec.ts --reporter=line` — **5/5
  passed (12.9s)**, with the app token held at **both** locations
  (`app/.app-token` and `$TEMP/cairn-app-token`, both taken by `mkdir` before
  the run and released after). This covers the decisive new scenario
  (removal + byte-identical folder + reopen) and the repaired broken-entry
  scenario in a real Electron run against the throwaway isolated profile —
  the owner's real remembered list was never touched, and the test windows
  parked off every display (Task 154).
- Final Git protection check — this task committed only its own exact paths;
  all foreign in-flight work (the Task 156 cast port, the concurrent lane's
  Task 157 follow-ups files, `design/`, the two app logs, the uncommitted
  LOG.md rows 148–154) was left exactly as found.

## Lane events and disclosures

- **Renumbered 157 → 158.** While this task's brief was being written, a
  concurrent lane committed its own brief claiming 157 (`2bf60d8`). This
  lane's first brief commit (`b723063`) inadvertently overwrote that file;
  the concurrent lane's brief was restored byte-exact from `2bf60d8` (verified
  with `cmp`) and this task renumbered to 158 in `e0999ee`, per the
  contract's later-claimant-renumbers rule. History was not rewritten.
- **Token wait.** When this task reached its E2E step, the concurrent lane
  was mid-run and held both token locations (7 live `electron.exe` processes
  observed, windows parked off-display). This lane waited ~11.5 minutes per
  the contract, then took both locks cleanly. No process was killed and no
  foreign lock was removed.
- **CRLF → LF.** The retained `Picker.tsx` working copy used CRLF endings;
  Git normalized it to the repo's LF on commit. Content unchanged.
- **LOG.md** gained this task's row but stays uncommitted per the Task 149
  precedent (rows 148–154 await the owner's decision).
- Pre-existing untracked evidence (`design/`, the two `app/*.log` files, the
  148/150 records) remains untracked, as found.

## How to try it

1. Open the Cairn app and go to **Your projects** (from a project: ← Project
   home → Switch project → All projects).
2. Beside any healthy project, click **Remove from this list**. The card
   disappears immediately; the project's folder and files on disk are
   untouched — only Cairn's remembered list changes.
3. Click **Open a project folder** and pick that same folder: it opens again
   normally and reappears in the list.
To re-run the decisive check yourself: from `app/`,
`npx playwright test tests/projects.spec.ts` (takes the same tokens; run
`npm run build:vite` first if sources changed).

## Limitations / remaining human judgment

- Verification ran in a tree that also contains two other lanes' in-flight,
  uncommitted work (Task 156 cast port, Task 157 follow-ups). All checks
  passed with that work present and compiling; if either lane's edits change
  before landing, the green here reflects this tree at this time.
- Removal is one click with no confirm dialog, matching the existing broken
  entry's control; it only ever edits the app's list, never the disk. Whether
  a confirm step is wanted is an owner call for a later task.
- Milestone movement: **NO**.

Disposition: **DONE**
