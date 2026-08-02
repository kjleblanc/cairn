# Task 167 — a taste-driven Cairn ease-of-use mockup

Base commit: `d69966cb3fa6839655dbf552ad31d481b11f6222`

## Outcome

The owner received and approved an interactive Cairn desktop mockup. The final
direction makes the Town and conversation one place: selecting Cairn opens the
conversation, and real work moves visibly through the Town instead of being
represented by a separate Chat destination.

Task activity behaves like a calm pond. A task packet travels from Cairn to the
selected worker and creates that worker's identity-colored ripple only when it
lands. A worker's question travels back to Cairn before a message badge appears;
the owner's answer returns to the same worker. A completed result travels back
and lands at Cairn before checking can begin. The app's existing Cairn, Kimi,
Codex, and Claude faces remain the cast rather than being replaced by the
mockup's earlier avatar proposals.

The owner's “cool” response to the final direction on 2026-08-02 is the
decisive human-judgment check for this taste-driven task.

Disposition: **DONE**

## Visual and ease-of-use decisions

- **One place, one relationship.** Cairn is the conversation entry point inside
  the Town; “Chat” and “Town” are not competing destinations.
- **Motion is information.** Packets show where responsibility is moving. A
  notification, ripple, or verification state appears only after the event it
  represents has actually landed.
- **Identity stays stable.** The exact live-app face geometry, marks, tilts,
  expressions, colors, and blink character remain recognizable. Cairn is
  `#7fd8c8`, Kimi `#c9a7e8`, Codex `#f2a35c`, and Claude `#9fb8d8`.
- **The pond carries meaning.** The moving packet tells the owner what is in
  transit; the receiver's identity color creates the landing ripple. Coral and
  moss affect the water's semantic state without recoloring a character.
- **Friendly, not childish.** Soft islands, buoyant movement, plain language,
  and small character reactions supply the approachable life-sim warmth; dark
  water, restrained luminous traces, and crisp system detail supply Cairn's
  near-future cybernetic character.

## Files touched

Repository records:

- `docs/ai-work/tasks/167-brief.md` — claimed the mockup task and recorded its
  boundary and checks.
- `docs/ai-work/tasks/167-report.md` — this report.
- `docs/ai-work/LOG.md` — one appended Task 167 row.

Thread visualization workspace
`C:\Users\KenJL\.codex\visualizations\2026\08\02\019fc0bb-f1f3-77d0-846c-45bae209e15a`:

- `cairn-night-garden.html` and `cairn-night-garden-preview.html` — initial
  conversation-first visual exploration.
- `cairn-living-town.html` and `cairn-living-town-preview.html` — first unified
  Town and handoff exploration.
- `cairn-ghost-garden.html` and `cairn-ghost-garden-preview.html` — pond and
  luminous-system direction exploration.
- `cairn-ripple-pond.html` and `cairn-ripple-pond-preview.html` — final approved
  direction with the live app's faces and honest packet/ripple timing.

No application source, dependencies, stored data, provider settings, consent
wording, approvals, or security behavior changed.

## Checks and real results

All command output was observed in this task's terminal.

- Starting evidence: `git status --short` — no project paths were reported.
  Task 167's brief was then committed alone at
  `029a5c12e63c14ce307fbb3fae19bac24f7a5984`.
- Visualization render:
  `& 'C:\Users\KenJL\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\KenJL\.codex\plugins\cache\openai-bundled\visualize\1.0.16\skills\visualize\scripts\render.py' 'C:\Users\KenJL\.codex\visualizations\2026\08\02\019fc0bb-f1f3-77d0-846c-45bae209e15a\cairn-ripple-pond.html' 'C:\Users\KenJL\.codex\visualizations\2026\08\02\019fc0bb-f1f3-77d0-846c-45bae209e15a\cairn-ripple-pond-preview.html'`
  — passed and produced the standalone preview.
- A local Node structural validator read `cairn-ripple-pond.html`, compiled its
  inline JavaScript with `new Function`, rejected network-call primitives and
  remote resources, checked unique element IDs and resolved `getElementById`
  references, and required reduced-motion handling, the distinct
  `result-travel` gate, and all four live face colors — passed: 35 unique IDs,
  all references resolved, no network calls.
- A geometry comparison against `app/src/renderer/town/faces.ts` — passed 47 of
  47 Cairn/Kimi/Codex/Claude face tuples, including paths, widths, opacity,
  marks, tilts, colors, expressions, and blink identities.
- Static responsive inspection found no fixed viewport-height dependency,
  forced horizontal overflow, or control/text clipping rule at the 320px
  breakpoint. `prefers-reduced-motion: reduce` advances transitions without
  relying on the animation.
- Two independent read-only reviews found no blocker: the result's return is a
  distinct action-free state before checking, focus/open state is preserved,
  notification timing is honest, accessible labels stay current, and DOM/JS
  integrity holds.
- Owner visual review in this conversation — approved the final direction with
  “cool.”

Automated browser screenshot capture was unavailable in this environment, so
it was not claimed. The generated standalone preview, static responsive checks,
independent reviews, and the owner's inspection of the interactive inline
visual supplied the available verification. No real model, owner profile,
credential, network request, or paid call was used.

## How to try it

Open the final `cairn-ripple-pond` visual in the Task 167 conversation. Select
Cairn to open the shared conversation, then use the preview-moment control or
the visible actions to inspect dispatch, worker-question travel, Cairn's message
badge, answer return, result return, and the later checking state. The
`result-travel` moment deliberately offers no verification action until the
packet has landed and its Cairn-centered ripple has settled.

## Limitations and remaining judgment

This is a design artifact, not the live Cairn renderer. It demonstrates the
interaction contract and visual grammar; Task 168 must integrate them with real
runtime states without inventing progress, authorization, questions, results,
or verification. Exact spacing and motion tuning in the live desktop app remain
owner judgment after implementation.

Milestone moved: **NO**
