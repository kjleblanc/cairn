# Task 185 brief — bring the project chrome into the pond

## Requested visible outcome

The project rail at the side and the active-project/status surface across the
top should feel like parts of Cairn's pond environment, not separate opaque
panels laid over it. The active project must remain easy to recognize, project
switching and activity must remain easy to scan, and the compact window must
keep its honest one-line pond control.

## Boundary of intent

- Preserve project selection, task expansion, rail collapse, activity and
  urgency states, connection status, reset-layout behavior, keyboard focus,
  live-region semantics, and responsive pond behavior.
- Do not retire Project Home, remove screens or routes, or absorb any of the
  unfinished Task 183 work from the protected main checkout.
- Do not change conversation, proposal, dispatch, worker, provider, stored
  project data, dependency, permission, or security behavior.
- Preserve the completed Task 182 composer and Task 184 proposal handoff.

## Checks

- Add a focused renderer contract that distinguishes the integrated rail and
  active-project chrome from the old hard-edged panel treatment.
- Run the complete app unit suite, TypeScript check, renderer build, and lab
  build.
- Under both app locks, run an offline Playwright check that shows the real
  environment at a wide size and a compact size, exercises project switching,
  and saves screenshots for visual inspection without a provider or worker.
- Inspect the exact diff, final Git status, and the screenshots for legibility,
  focus visibility, state clarity, and accidental Task 183 overlap.

## DONE / STOPPED

`DONE` means both project surfaces visibly belong to the same pond environment,
their existing behavior and semantics still hold, all executable checks pass,
and the saved screenshots support that claim. `STOPPED` means that visible
cohesion or preserved behavior cannot be demonstrated without crossing the
boundary above.
