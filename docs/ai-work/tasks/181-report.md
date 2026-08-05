# Task 181 report — guaranteed fresh proposal after setting a risk aside

**Lane:** Standard (main checkout)

**Base commit:** `30b42898c4d84053bfa27d490ff97b62da076e00`

**Brief commit:** `356b352`

## Outcome

The set-aside path no longer depends on the conductor returning a usable
control block. Before Cairn accepts the owner's targeted reply, main now builds
and validates a safe replacement from the exact current authenticated task. If
the reply finishes with prose only, a malformed control, a question, an
unbound task, or a task that changes the request, drops another risk, or omits
the carried concern, main publishes its own fresh proposal instead.

The selected risk becomes visible task context prefixed with `Set aside by the
owner: `, every other risk remains unresolved with a fresh identity, and the
replacement itself has a fresh action identity. A conductor-supplied task may
still win when it preserves the exact request, the required context prefix,
and every remaining risk. The old action remains one-time: replaying it is
rejected as stale.

The saved conversation evidence established that the accepted set-aside turn
could be followed by no current action. It did not retain enough discarded
control detail to prove whether the conductor omitted a control or Cairn
rejected one, so this task does not guess between those historical causes. The
repair closes both at main's action-authority boundary, and the desktop test
proves the resulting action reaches the visible card.

## Files changed

- `app/src/main/conductor/setaside.ts` — builds the validated fallback and
  checks whether a conductor candidate preserves it.
- `app/src/main/conductor/service.ts` — prepares the fallback before retiring
  the old action and publishes it when the completed reply has no safe
  replacement.
- `app/tests-unit/setaside.test.ts` — pins exact request custody, context carry,
  remaining-risk preservation, candidate acceptance, and fail-closed bounds.
- `app/tests/conductor.spec.ts` — adds the prose-only visible regression and
  updates the affected current risk selectors and multi-risk expectation.
- `app/tests/fixtures/fake-conductor.mjs` — adds a one-shot prose-only
  set-aside reply and a semantically valid replacement fixture.
- `docs/ai-work/tasks/181-brief.md` — the separately committed task claim.
- `docs/ai-work/tasks/181-report.md` — this report.
- `docs/ai-work/LOG.md` — one Task 181 row appended. This file already contains
  Task 180's protected uncommitted row, so Git isolation is not clear and the
  whole file is deliberately left unstaged under the contract's protection
  rule.

Task 180's stopped files were not edited by Task 181. Their final SHA-256
custody values are:

- `app/vite.lab.config.ts` — `0DB4265E2E842C8671E6CA2DA431AD57194F849C9C25CC42C668295E3C680DA7`
- `app/lab/pondchrome.css` — `ED875D191DC28FC5904737105E8981AC3F4EBECAE31D05788540A5FF4F41CEE1`
- `app/lab/pondchrome.html` — `DB04AF7A0E60A0DC94E30F8B2279F1F40B252A6F682C7DC11E6C2F17EAB0359C`
- `app/lab/pondchrome.tsx` — `439B6933573A3216D4E3F841F0A4D6E3F18CBC108F2C22F8299D89AABD7FF349`
- `docs/ai-work/tasks/180-brief.md` — `79DA59A19C7FCB9A145C582FC1F6871FD85C8719FF45BCF373B6B614F019C4DC`
- `docs/ai-work/tasks/180-report.md` — `6A2445B529AF2407A9DEC119B012B7D465CB8DFAEF99C2F12D138B3752811BA3`

## Checks run and real results

1. Red-first unit compile and focused helper test:
   - `cd app && npx.cmd tsc -p tsconfig.unit.json` initially failed with the
     expected missing `setaside.js` module before implementation.
   - `cd app && npx.cmd tsc -p tsconfig.unit.json && node --test
     dist-unit/tests-unit/setaside.test.js` passed after implementation: **2
     tests, 2 passed, 0 failed**.
2. `cd app && npm.cmd run test:unit`
   - Passed from the final source tree: **365 total, 363 passed, 0 failed, 2
     platform-specific skips**.
3. `cd app && npm.cmd run typecheck`
   - Passed.
4. `cd app && npm.cmd run build:vite`
   - Passed: main, preload, and renderer production bundles built. The first
     restricted attempt was denied by sandbox filesystem traversal; the same
     local build passed with the required worktree access.
5. `cd app && npm.cmd run build:lab`
   - Passed from the final tree: **99 modules transformed**. This build read
     Task 180's protected pond lab files but did not change them.
6. Guarded fake-provider desktop verification, with no Electron process
   running, `CAIRN_TEST_LANE=1`, one worker, and both `app/.app-token` and
   `%TEMP%/cairn-app-token` atomically held for the entire run:
   - `npx.cmd playwright test tests/conductor.spec.ts --workers=1 --grep
     "dispatch preview accepts only the current risk-free proposal|a
     prose-only set-aside reply still yields a fresh dispatch-ready
     proposal|attributed task actions keep raw owner bytes|a targeted risk
     reply retires the whole old action"`
   - Passed: **4 tests, 4 passed, 0 failed (1.2 minutes)**. It proves the valid
     conductor replacement, prose-only main fallback, raw owner/action custody,
     old-action replay rejection, remaining-risk preservation, visible fresh
     card, and enabled **Review dispatch** when no risks remain.
   - The final screenshot is
     `C:\Users\KenJL\AppData\Local\Temp\cairn-task-181-setaside-fallback.png`.
     Both locks were released and the Electron process count returned to zero.
7. `git diff --check`, exact diff/status inspection, and protected-path hashing
   - Passed before these records were written. No paths were staged, and the
     only pre-existing changes remained Task 180's disclosed stopped evidence.

Early desktop attempts were not treated as product evidence: the owner still
had Cairn open, so the single-tenant run waited rather than closing it; after
that, the touched tests exposed Task 179's deliberate `.task-chip-risk` to
`.task-risk` markup change and were repaired. One final wrapper attempt also
failed before acquiring either lock because Windows PowerShell's `New-Item`
does not accept `-LiteralPath`; the corrected `-Path` wrapper produced the
four-test pass above. No process was killed.

All provider-shaped verification used the local scripted fake. No real model,
credential, paid request, worker dispatch, push, deployment, or external write
occurred.

## How to try it

1. Open Cairn normally and reach a proposed task that shows one or more risks.
2. Press **Set aside** on one risk.
3. After Cairn's reply finishes, confirm a fresh card is visible. The concern
   should appear under context; other risks, if any, should remain.
4. When that was the last risk, **Review dispatch** should be enabled. Pressing
   it opens the preview; it still does not start work until the separate final
   confirmation.

With a real connected conductor, step 2 makes one provider call under the
connection's standing authorization and cost basis. The automated evidence
above is the no-cost way this task was verified.

## Limitations and decisions

- If the exact authenticated intent is already at its three-context-note limit
  and the concern is not already present, main refuses before retiring the old
  card. Losing existing context would be less honest than a visible refusal.
- Provider/network or conversation-write failures still use their existing
  explicit error paths; this repair covers completed replies whose usable
  replacement control is absent or unsafe.
- The four directly affected Electron scenarios were run, not the full older
  conductor file. Unrelated selector migration deferred by Task 179 remains
  outside this task.
- AI implementation decision: keep the repair in main, not the renderer, and
  revalidate the existing authenticated intent through Core before any
  one-time authority is spent.
- Milestone moved: **NO**. The milestone still requires the complete
  request-to-verified-DONE conversation on Cairn itself; this task removes one
  blocker on that path.

**Disposition: DONE**
