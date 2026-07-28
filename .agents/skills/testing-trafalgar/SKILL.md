---
name: testing-trafalgar
description: How to runtime-test the Trafalgar (Battleship reskin) game in a browser — where it runs, how to drive the board efficiently, how to reach hard-to-hit states like sinking a specific ship or the Death of Nelson variant.
---

# Testing the Trafalgar game end-to-end

## Where to run it

- Preferred: the deployed build (a `*.devinapps.com` URL supplied by the lead). No login, no backend, no secrets.
- Local alternative: `npm run dev` → http://localhost:5173. Vite dev/build works with a plain `npm install`.
- `npm test` / `npm run lint` need two optional native bindings that npm skips on this VM (npm/cli#4828):
  `npm install --no-save "@rolldown/binding-linux-x64-gnu@$(node -p "require('rolldown/package.json').version")" "@oxlint/binding-linux-x64-gnu@$(node -p "require('oxlint/package.json').version")"`.
  The repo blueprint already runs this in `maintenance`, so it is usually unnecessary.
- Nothing persists across reload — a reload restarts at the title screen and loses the game.

## Driving the board through the UI (no devtools needed)

- Every cell is a real `<button>` with an accessible name like `B7, unfired` / `C3, hit` / `D4, miss`, and on
  revealed/own boards it appends the ship name (`F9, hit, HMS Victory`). The `read_dom`/page-HTML returned with each
  computer-use screenshot is therefore a complete, reliable oracle: shot counts, hit/miss per cell, whole ship
  layouts, fleet-list `afloat`/`struck` state, and the numbered signal log. Prefer this over any console evaluation.
- Board geometry at a maximized 1600px-wide window with Chrome at 90% zoom, in tool coordinates:
  columns A..J at x = 134,164,194,224,254,284,314,344,374,404; rows 1..10 at y = 193,222,252,282,312,341,371,401,431,462.
  The player's target board is the left one; the right board (own fleet) is `disabled`.
  Re-derive these from a screenshot if the window size or zoom differs.
- Input is locked ~650ms after each shot while the AI replies. Click one cell, `wait` 2s, click the next. Batching
  4–5 click+wait pairs in a single computer-use call is a good throughput/verification tradeoff.
- A full game vs Nelson takes ~45 player shots, so budget 30–50 tool calls for it.

## Reaching specific states

- **Sink a named ship (e.g. for the Death of Nelson variant):** ships are 5/4/3/3/2 cells. Sweep the board with a
  spacing-5 pattern, then walk outward from a hit. Deduce identity from length: if N cells are hit in a line, both
  ends are misses and the ship has *not* sunk, it is longer than N — and if no unsunk ship of length N+1 exists,
  the target must be the 5-cell HMS Victory. This lets you find Victory in ~30 shots instead of clearing the board.
- **Death of Nelson ON:** checkbox at the bottom of the deployment sidebar. With it on, sinking HMS Victory ends the
  game immediately with "The British line is broken" and "British ships taken" **less than 5 of 5**. Note the toggle
  stays ticked through "Put to sea again", so untick it if you want the default rules again.
- **Resign / rematch / change opponent:** "Strike your colours" in the battle header goes straight to aftermath
  ("You struck your colours"); "Put to sea again" returns to deployment with a fresh board and the same difficulty;
  "Change opponent" returns to the title screen.
- **"Engage only with all five ships placed" is unreachable from the UI** — the reducer pre-places all five ships at
  init. Report it as untestable by design rather than passing.

## Responsive + console checks

- Resize with `wmctrl -r "<window title>" -e 0,0,0,<w>,<h>` (a 555px-wide window gives ~581 CSS px at 90% zoom).
  Verify `document.documentElement.scrollWidth == clientWidth` for "no horizontal scroll". Restore with
  `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz` before further recording.
- Expect a completely clean console. A stray `[vite] hot updated` debug line can appear if a dev server was open
  earlier in the session; it is not an app error.

## Devin Secrets Needed

None — the app is fully client-side with no auth.
