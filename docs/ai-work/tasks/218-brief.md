# Task 218 brief - the owner sees the exact critic call before it is approved

**Lane:** A (the main checkout). **Base commit:** `dd622da`.

**Plan position:** Prerequisite Q, Task Q8, **stage 3 of 4**. Stage 1 (Task 216)
said which call is approved; stage 2 (Task 217) bound the send to it. This stage
adds the only thing that can *ask the owner*. Stage 4 is the calibration-only
orchestrator, which is what will finally drive this surface. Q9, Q10, and
owner-verdict Plan 2 remain unstarted. Tasks 215's pending-run custody, 216's
authorization, and 217's transport are part of this base and must stay intact.
Task 212 remains unmerged on `lane/g` and is not touched.

## Requested visible outcome

Before any critic call, the owner can see exactly what would be sent and approve
exactly that call, once. Cairn composes an **Independent critic** disclosure
from the approved call itself — never from the renderer — listing every selected
file by project-relative name, hash, and character count with the running
totals, the exact provider, base URL, configured and resolved model and its
revision, the consent version, the route/request fingerprint, the purpose, which
attempt of the cap this is, the time and captured-output limits, and an honest
billing basis. It says plainly that the critic cannot read or edit the project
or declare DONE, and it names what is **not** sent: no tools, images, untracked
or ignored files, links, generated or dependency content, and no credentials.

The frozen Task Spec's critic mode decides the controls: `required` offers
**Approve this critic call** or **Stop this task**; `optional` offers **Approve
this critic call** or **Continue without critic**; `off` shows no call control
at all. One decision consumes the approval, and Cairn re-derives the disclosure
at that moment: if what would be sent has changed since the owner looked, the
decision refuses rather than approving something the owner never saw.

This follows the dispatch approval already in the product — a one-use opaque
preview id, a Main-composed disclosure, and a re-derivation before the call —
rather than inventing a second approval mechanism.

## Boundary of intent

- Implement in `app/src/shared/critic-call.ts` (new), `app/src/main/criticapproval.ts`
  (new), `app/src/shared/ipc.ts`, `app/src/preload.ts`, `app/src/main/ipc.ts`,
  `app/src/renderer/components/CriticCall.tsx` (new), both
  `app/src/renderer/screens/Chat.tsx` and `TaskRun.tsx`, and their tests.
- **This stage stays dark.** Approving produces an authenticated grant that
  nothing consumes: no transport call, no provider call, no network primitive,
  no adapter advertising `packet-only-critic`, and an empty activation registry.
  Nothing in production composes a disclosure yet — the field is output-only and
  always absent until stage 4's orchestrator exists, exactly as Q5's task review
  landed.
- Task 216's authorization, 217's transport and ledger, 215's pending-run
  custody, and Task 209's packet, request, output, assessment and policy
  behaviour are preserved exactly. No Core change is expected; if one proves
  necessary it is disclosed in the report as an addition with its reason.
- A credential never enters a disclosure, an action, an error, a log, or a
  rendered string. Neither does an absolute path, an outside-project path,
  `.git`, `.cairn`, `userData`, the project hash, or any packet content: the
  card names files, hashes and counts, never their contents.
- The renderer is output-only. It chooses a closed decision on an opaque id and
  echoes back what it was shown; it cannot supply or widen a selection, model,
  cap, mode, billing basis, or fingerprint, and nothing it sends becomes
  authority.
- Use local fake/unit/build verification only. Do not make a provider, model, or
  network call, use a credential, install a dependency, touch the owner's real
  app profile, push, publish, or deploy.
- **Electron and Playwright are deferred to stage 4 by owner decision, recorded
  here.** A journey needs something to drive the card, and stage 4's orchestrator
  is what will drive it; adding a test-only production route to run the journeys
  a stage early would put a seam in shipped code whose only purpose is testing.
  The cost is accepted and stated: this surface is not proven in a real Electron
  window until stage 4. That stage's journeys need the single-tenant app token
  and the owner out of Cairn, and the brief for it must name that precondition.

## Checks

1. **`c1` - the card says exactly what would be sent, and no more.** Main
   composes the disclosure only from a branded `CriticCallAuthorizationV1`; a
   plain object, clone, or renderer-supplied record composes nothing. It carries
   every selected file's project-relative name, hash and character count plus
   the file, per-file and total character counts against the 8 / 8,000 / 32,000
   consent caps; the exact provider, base URL, configured and resolved model,
   resolved revision, consent version and route/request fingerprint; the
   purpose, this attempt and the cap, the timeout and captured-output limits,
   and the honest billing basis. It states that the critic cannot read or edit
   the project or declare DONE, and it names what is not sent. It contains no
   absolute path, outside-project path, `.git`, `.cairn`, `userData`, project
   hash, credential, or packet content.
2. **`c2` - one approval, one decision, bound to this exact call.** The approval
   id is opaque, one-use and main-owned. Main re-derives the disclosure when the
   decision arrives and refuses when it differs from what the owner was shown;
   the renderer's echoed disclosure must match. A replayed, stale, unknown,
   cross-project, or cross-call id refuses without consuming the genuine one,
   and a decline consumes the approval exactly as an approval does.
3. **`c3` - the frozen mode decides the controls.** `required` offers approve or
   stop; `optional` offers approve or continue without the critic; `off` offers
   no call control and composes no approval at all. A decision naming an action
   the mode does not offer refuses, and the renderer cannot change the mode.
4. **`c4` - approving sends nothing.** Approval yields an authenticated grant
   with no consumer: no `sendCriticCall` caller exists in production, no adapter
   advertises `packet-only-critic`, the activation registry is empty, and no
   network primitive, filesystem, or process channel exists in the new modules.
   Nothing in the production task path composes a disclosure.
5. **`c5` - the renderer cannot forge, widen, or replay.** The shared projection
   parser refuses extra or missing keys, clones, proxies, accessors, prototype
   tricks, sparse arrays, and out-of-range values. A renderer-supplied
   selection, model, cap, mode, fingerprint, or billing string never reaches
   Main's decision, and no IPC channel returns anything a renderer could use as
   authority for a later call.
6. **`c6` - verified isolation and regression safety.** Focused new tests, the
   complete Core suite, the App unit suite, both typechecks, the Vite build,
   exact diff and status, and darkness searches proving the surface is
   unreachable in production all pass, with Tasks 209, 215, 216 and 217
   unchanged. An independent adversarial review runs against the final diff and
   its findings are repaired or recorded, never silently closed. No dependency,
   provider call, network call, credential, real app profile, Electron run, or
   external write occurs.

## DONE and STOPPED

**DONE** means all six checks pass; the owner-facing card states every fact the
design requires and nothing it forbids; one approval decides one call once and
refuses anything stale, replayed, or changed; the frozen mode decides the
controls; approving still sends nothing; Tasks 209, 215, 216 and 217 behave
exactly as before; one report and log row record the evidence including the
deferred Electron journeys; the Task 218 paths land in one exact-path final
commit; and `main` is clean.

**STOPPED** means a disclosure can be composed from anything but an approved
call, a card can understate or misstate what would be sent, a credential or a
path outside the consent can reach the owner's screen or a record, an approval
can be replayed or can approve a call the owner did not see, the renderer can
supply authority, or anything added here makes a provider call.
