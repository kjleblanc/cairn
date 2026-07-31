# Task 147 brief — the cast: a character board for Cairn and the workers

## Requested visible outcome

The owner wants distinct "avatars" for Cairn and for each type of AI worker,
so every villager in the town reads differently at a glance. This task is the
design step, done the way Tasks 144 and 136 worked: a throwaway lab-only
"character board" page that presents Cairn plus three or four worker concepts
under two or three art directions (Animal Crossing warmth, one Ghost in the
Shell cybernetic detail per character), captured and published as the top
entry on the shots page so the owner can pick a direction. Porting the winner
into the real app is a later task.

## Boundary of intent — what must not change

- No change to shipped app behavior, layout, tokens, or copy. The board is
  lab-only, reached through the lab server, exactly like Task 144's
  worldboard.
- No new runtime dependencies in the shipped app.
- Lane discipline: this lane works on main in this checkout; other lanes'
  branches and uncommitted work stay untouched.
- Existing task records and LOG rows are history: never rewritten.

## Checks that will show the outcome holds

- `npm.cmd run typecheck` and `npm.cmd run build:lab` clean (the board joins
  the lab build inputs).
- The board page loads on the lab server and every capture image 200s.
- Captures (one per art direction, minimum) inspected by me before
  publishing: characters legible at town-node size, directions genuinely
  distinct, each cast member recognizable by silhouette alone.
- Manifest entry published as the top entry on `/shots.html`.

## DONE and STOPPED

- DONE: the board is up, captures inspected and published, checks green,
  records written, one exact-path commit landed.
- STOPPED: the board can't be built or captured credibly, or checks fail in
  a way repair can't honestly fix; stop with the state preserved and the
  smallest useful next choice named.
