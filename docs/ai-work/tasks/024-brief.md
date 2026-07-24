# Task 024 — Chat screen (layout A), gated behind CAIRN_CONDUCTOR=1

Requested visible outcome: a governed project's Dashboard shows a "Talk with
Cairn" button only when `CAIRN_CONDUCTOR=1`; clicking it opens a full-bleed
scene with a floating conversation column — a connect card first (base URL,
model, key, the main-derived consent text, the standing-consent checkbox),
then, once connected, a message list, streaming replies with a Stop button,
a composer, a body pill (provider · model, with a model-change/disconnect
panel and last-reply token/cost), a back control, and "New conversation".
Provider errors render as a plain system bubble with "Try again". Nothing
reachable without the flag changes.

Boundary of intent: create `app/src/renderer/screens/Chat.tsx`,
`app/src/renderer/components/ConnectCard.tsx`,
`app/src/renderer/components/BodyPill.tsx`; modify `App.tsx` (add the
`"chat"` view; Dashboard gains the button), `Dashboard.tsx` (the button and
its prop plumbing), `components/Scene.tsx` (a `fill` prop, Dashboard's use
unchanged), `app.css` (the chat layout), `main.ts` (call
`registerConductorIpc()` unconditionally — the flag gates renderer
reachability only, not channel registration), `main/ipc.ts` (surface
`CAIRN_CONDUCTOR` on `preflight:check` as `Preflight.conductor`, plus one
authorized addition: a `conductor:consentCard` channel returning the
main-derived `ConductorConsentCard` so the renderer never duplicates those
strings), `preload.ts` and `shared/ipc.ts` for that channel's plumbing.

Checks: `npm run typecheck` clean; `npm run test:unit` stays at 37/37;
`npm run build:vite` clean; `npm run test:smoke` stays at 13/13 (the
`routing.spec.ts` App.tsx tripwires must still pass); manual visual smoke
with `CAIRN_MOCK=1 CAIRN_CONDUCTOR=1` showing the button, the connect card,
and (via a throwaway fake SSE server, not committed) the full connected
layout, persistence across a relaunch, and disconnect.

DONE means the outcome above holds and the checks pass. STOPPED means they
do not.
