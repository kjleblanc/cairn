# Task 168 — bring the Ripple Pond language into the live Town

Lane: **Standard (main checkout)**

Base commit: `9d662fafb296a3ecd7202c6e872abcada2ed276d`

## Requested visible outcome

The real Cairn desktop workspace should feel like the owner-approved Task 167
direction: one calm, continuous Town centered on Cairn, using the shipped cast
of model-specific faces and a restrained pond/ripple motion language to show
where real work is going.

The existing Task 146 “villager bubble” remains the conversation. Selecting
Cairn opens, untucks, and focuses that same conversation inside the Town; the
owner should never have to choose between “Chat” and “Town” as separate places.
When an approved real worker run begins, a task packet visibly moves from Cairn
to the selected worker and creates one receiver-colored ripple only when it
lands. The worker remains visibly active without an invented percentage. When
the worker's result reaches Cairn, the return is visible before the Town settles
into Cairn's checking/terminal presentation. Verified DONE and honest STOPPED
must be unmistakably different in words as well as water state.

This task ports the interaction grammar into the live app; it does not copy the
mockup wholesale or redesign Cairn's workflow.

## Approved event-to-motion mapping

| Real runtime event | Owner-visible response |
|---|---|
| No conversation stream or worker transfer | Calm pond; no packet, ripple, or implied activity. |
| Cairn is replying | Cairn uses its real thinking state; the in-world conversation remains the readable source of truth. |
| Proposal awaits approval | Work remains visibly at Cairn/the owner's gate. Nothing travels before the existing approval succeeds. |
| Main accepts a real worker dispatch | One labeled task packet travels Cairn → selected worker; the worker's identity color makes one landing ripple. |
| Worker is running | That real worker is lit and named “working”; activity text comes from the real run, with no fabricated percentage or looping packet traffic. |
| Worker result has returned and checking begins | One result packet travels worker → Cairn from the real Run/Check transition; Cairn's accessible state announces checking from the real activity even if the visual arrival animation is still settling. |
| Check/Result is verified DONE | One restrained moss-toned success change reaches the pond around Cairn, while Cairn keeps its own cyan identity and the result card remains the authoritative explanation. |
| Check/Result is STOPPED or failed | An honest coral pond state and STOPPED wording appear; never a success ripple, smile, or DONE implication. |

The moving packet says **what** is changing hands. The receiver's stable identity
color says **who** received it. Moss and coral describe the outcome in the water;
they never recolor a character.

## Boundary of intent

- Preserve `app/src/renderer/town/faces.ts` byte-for-byte unless a test-only
  import needs to move. Do not change the cast's geometry, marks, colors, adapter
  mapping, tilt, expressions, or blink rhythms. In particular, keep Cairn
  `#7fd8c8`, Kimi `#c9a7e8`, Codex `#f2a35c`, and Claude `#9fb8d8`.
- Preserve the Task 146/151/155 conversation behavior: Cairn opens the in-world
  villager bubble, tuck/focus still works, the layout stays usable, queued sends
  remain ordered, old result cards fold, and the existing needs-you indicator
  remains meaningful.
- Preserve every authorization and truth boundary: proposal parsing, owner
  approval, adapter routing, worker disclosure/consent, provider connection,
  task execution, verification, result cards, project storage, and security.
  A visual transition may replay an event already observed; it may never start,
  delay, approve, or manufacture that event.
- Preserve current worker visibility: a villager represents a real model-backed
  running process, not an installed adapter, the offline demo, a fictional
  resident, or a stale closed session.
- Keep selecting any face observational. Selecting Cairn may focus the existing
  conversation; selecting a worker may show existing details. Neither action
  dispatches, approves, resumes, or calls a model.
- Do not add dependencies, change persisted Town data, open the owner's app
  profile, use credentials, make a real/paid model call, or change phone
  behavior. Tests use local fixtures and isolated profiles only.
- Motion must remain brief and state-bound, never perpetual decoration. Every
  state is also named in text, keyboard focus remains visible, and
  `prefers-reduced-motion` reaches the same stable state without waiting on an
  animation.
- Keep the app's familiar project/task wording and the readable result card.
  The pond is ambient orientation, not a replacement for explanations or
  controls.

## Deliberately separate follow-up

The approved future question choreography remains: a worker question travels
worker → Cairn; Cairn's message badge appears only after it lands; the owner's
answer then travels Cairn → that same worker.

The current `RunSessionSnapshot`, serial envelope, and Town model expose no
paused-worker question or answer/resume state. Task 168 must not fake that
journey from generic activity or conversation text, and must not silently add a
new worker-control protocol. Keep the packet/ripple component vocabulary able to
express it, but implement the real question transport and its risk/consent
semantics in a separately claimed capability task.

## Checks that will show the outcome holds

- Add focused unit tests for runtime-event → Town-presentation mapping. Pin the
  quiet state, no travel before accepted dispatch, one dispatch arrival, real
  worker-only visibility, result return before terminal presentation, verified
  DONE, and STOPPED. A repeated poll/render must not replay a transition.
- Keep byte-exact face-definition and adapter-mapping tests green; add a
  regression that the visual event layer does not alter face identity colors.
- Add focused renderer/E2E coverage with the repository's fake conductor and
  fake worker. Prove that selecting Cairn opens/focuses the same in-Town
  conversation, selecting a worker never dispatches, the task packet appears
  only after approval, receiver ripple appears only on landing, the result
  return is gated by real Run/Check activity, and DONE/STOPPED never cross.
- Check native keyboard operation, live state wording, focus visibility, and a
  reduced-motion run that reaches the same final DOM state without animation
  timing assumptions.
- Capture and inspect at least these real-app states at the normal desktop size
  and a narrow supported window: quiet conversation, accepted dispatch,
  working, result return/checking, verified DONE, and STOPPED. Confirm no clipped
  conversation, node, label, action, horizontal scroll, or unreadable overlap.
- Run from `app/`: `npm.cmd run typecheck`, `npm.cmd run test:unit`,
  `npm.cmd run build:vite`, and `npm.cmd run build:lab`, then the focused
  Playwright cases. Hold and release Cairn's app token for every real-app/E2E
  run; use an isolated throwaway profile and no paid calls.
- Run `git diff --check`, inspect the real diff and final Git status, and confirm
  only Task 168's exact implementation, tests, captures/manifest if tracked,
  report, and LOG paths enter its final commit.
- Put the live result on the owner's screen. The decisive final check is the
  owner's judgment that it retains the app faces they like and captures the
  calm pond/ripple feel without becoming busy or obscure.

## DONE and STOPPED

**DONE** means the live desktop Town exhibits the real dispatch → worker →
result/check → verified DONE or STOPPED sequence above, Cairn still opens the
same usable conversation, every transition is driven by real runtime evidence,
automated and visual checks pass, the owner approves the live feel, and the
report plus LOG row land in one exact-path local commit.

**STOPPED** means the live sequence would require fake state, weaken an approval
or verification boundary, change the shipped faces, add the unscoped worker
question protocol, disturb protected work, proceed without the app token, or
cannot be made accessible and readable without changing the approved outcome.
