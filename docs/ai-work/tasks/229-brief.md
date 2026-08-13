# Task 229 brief - show an inert Builder proposal review card

**Lane:** A (the main checkout). **Base commit:** `ed8cd4f`.

## Requested visible outcome

Cairn has a clear owner-facing review card for the proposal-only Builder
workflow. In the local visual lab, the owner can see either an exact bounded
tracked-text replacement proposal or one of Task 224's five inert capability
requests in Cairn's real visual language. The card unmistakably says that it is
only a proposal: Cairn has not applied, executed, published, or verified the
suggested change.

This task deliberately stops at review. The card has no Apply, Approve, Run,
Open, Send, Publish, Continue, or similar control. A later production task must
design an authenticated non-terminal conversation/store/IPC route rather than
misuse Cairn's authenticated terminal result card, which represents an actual
`DONE`, `STOPPED`, or `ERROR` outcome.

## Boundary of intent

- Compose the display projection only from a genuine, exactly bound Task 224
  context and response. Raw/cloned/mismatched protocol objects refuse at the
  Main boundary; a structural clone of the already composed display projection
  remains inert display data and cannot mint an action.
- Render Builder-controlled strings as literal React text. Do not interpret
  Markdown or HTML, use `dangerouslySetInnerHTML`, create dynamic tags, links,
  images, styles, forms, inputs or buttons, or turn a suggested target into a
  path, URL, argv, callback or IPC request.
- Show a fixed Cairn-authored boundary, the Builder-attributed summary, exact
  replacement path/before-and-after hashes and bounded before/after text; or a
  fixed category label plus all bounded capability fields with the suggested
  target explicitly labeled untrusted.
- Keep the surface lab-only and product-dark. Do not add or change a production
  conversation turn, `ResultCard`, store/card-auth format, pending-run schema,
  Main route, preload/IPC API, phone route, conductor commentary, provider/model
  transport, credential/network access, activation, candidate publication,
  verifier, command runner, filesystem/Git writer, reservation grant, or
  approval authority.
- Do not persist proposals or use a real project selection. The visible lab
  fixture uses fixed synthetic Task 224 data only. No package/dependency,
  permission, profile, stored-data, external-service, push or deployment change
  is in scope.
- Preserve Task 223's isolation STOP, Task 225's live-writer STOP, Task 228's
  durability STOP, the empty activation registry, normal legacy task route,
  existing result-card semantics and all protected lane work.

## Checks

1. **`c1` - the review projection preserves exact Task 224 custody.** A
   Main-owned pure composer accepts only the exact live branded context and its
   bound branded response, exact-joins every replacement path/hash/before text,
   maps the closed response vocabulary into an exact-key deeply frozen display
   projection, and exposes no protocol brand or authority. Wrong context,
   run/turn, stale response, raw object, clone, extra key, accessor, Proxy and
   cross-context replay refuse.
2. **`c2` - proposal rendering is literal and inert.** The component accepts
   only the display projection and no callback. Hostile strings in every
   Builder-controlled field render as escaped text with zero script, image,
   SVG, style, link, form, input or button nodes. Source and causal mutant tests
   reject HTML/Markdown interpretation, dynamic targets and action seams.
3. **`c3` - both proposal kinds are complete and honest.** Replacement cards
   show the fixed proposal-only warning, Builder-attributed summary, exact path,
   before/after SHA-256 and bounded before/after text in canonical row order.
   All five capability categories use fixed Cairn labels and show `what`, `why`,
   expected effect, data exposure, cost basis, recovery and an explicitly
   untrusted suggested target. No card claims currentness, correctness,
   verification, approval, execution or terminal task success.
4. **`c4` - the owner can inspect the card in the visual lab while production
   stays dark.** One unmistakably synthetic replacement scenario and one
   capability scenario render in Cairn's real visual grammar. Static
   import/export/consumer tests prove no production source, bundle, package,
   preload, IPC, store, route, result-card, activation or commentary path can
   create or consume the review projection.
5. **`c5` - the card cannot cause or authorize an effect.** Exact source and
   package scans prove no filesystem, Git, process, native, network, provider,
   credential, reservation, candidate, grant, approval, URL or environment
   seam. JSON/structural clones remain display-only; all clicks/keyboard focus
   within the card expose no actionable element; normal capabilities/routes and
   activation remain unchanged.
6. **`c6` - verification, owner-visible evidence and records are complete.**
   Red-first focused tests, App/Core compatibility checks, a rendered lab
   inspection, exact diff/status review and three independent adversarial
   reviews pass. The report names the visual evidence and every transient/final
   path; one LOG row and one exact local completion commit answer all checks.

## DONE and STOPPED

**DONE** means all six checks pass; the owner can inspect both synthetic
proposal kinds in a clear lab-visible card; every Builder-controlled value is
literal inert text; genuine Task 224 custody is preserved through projection;
production/result-card/route/activation surfaces remain dark; no proposal can
perform or authorize an effect; and exact records and implementation land in
one clean local commit.

**STOPPED** means visibility requires a production turn/store/IPC change, a
real project or provider, an action control or effect authority; genuine Task
224 response custody cannot be preserved; hostile text can become markup,
navigation or code; the UI implies application/verification/terminal success;
existing routes or protected work change unexpectedly; owner-visible evidence
cannot be produced safely; or any invariant lacks causal proof.
