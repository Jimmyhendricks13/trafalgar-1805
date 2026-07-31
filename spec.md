# Trafalgar — Specification

**Working title:** *Trafalgar 1805 — Rewrite the Afternoon*
**Type:** Single-player browser game. Battleship, reskinned as the Battle of Trafalgar.
**Player:** The Franco-Spanish Combined Fleet (Villeneuve).
**AI:** The British Royal Navy (Nelson).
**Tone:** Napoleonic naval realism. Dramatic but restrained. Oil paintings, not cartoons.

---

## 1. Scope

### In scope (v1)
- Single player versus AI, three difficulty levels.
- Classic Battleship rules, historically reskinned. No new mechanics.
- Manual fleet deployment, plus "Adopt Villeneuve's Formation" and "Randomise".
- Signal log with light flavour text.
- Skippable historical preamble.
- Local, in-memory state only. No accounts, no server, no persistence beyond the tab.
- Deployed as a static site with a public URL.

### Explicitly out of scope
- Multiplayer, accounts, leaderboards, saved games, analytics.
- Historical mechanics beyond flavour: no wind gauge, no morale, no boarding, no
  line-of-battle bonuses, no crossing the T. (Recorded here as possible phase 2.)
- Mobile-native app. The site is responsive but browser-only.

---

## 2. Rules (normative)

The rules are standard Battleship. They are stated exhaustively because the AI and the
tests depend on the exact wording.

### 2.1 Board
- Two 10x10 grids. Columns labelled `A`–`J` (left to right), rows `1`–`10` (top to bottom).
  A cell is addressed as `B7`. Internally a cell is `{x: 0..9, y: 0..9}`.
- The player has a fleet grid (own ships, all visible) and a targeting grid (the enemy's
  waters, showing only the player's own shot results).

### 2.2 Fleets
Each side has five ships, of lengths 5, 4, 3, 3, 2 (17 cells total). Ship names are the
real ships present at Trafalgar; length is assigned by rate, largest ship longest.

**Franco-Spanish Combined Fleet (player)**

| Length | Ship | Guns | Note |
|---|---|---|---|
| 5 | *Santísima Trinidad* | 136 | Four decks. The largest warship in the world in 1805. |
| 4 | *Bucentaure* | 80 | Villeneuve's flagship. |
| 3 | *Santa Ana* | 112 | Vice-Admiral Álava. |
| 3 | *Redoutable* | 74 | Captain Lucas. Her musketry killed Nelson. |
| 2 | *Achille* | 74 | Burned and blew up late in the action. |

**Royal Navy (AI)**

| Length | Ship | Guns | Note |
|---|---|---|---|
| 5 | *HMS Victory* | 104 | Nelson's flagship. |
| 4 | *HMS Royal Sovereign* | 100 | Collingwood's flagship, first into action. |
| 3 | *HMS Téméraire* | 98 | Later "the Fighting Temeraire". |
| 3 | *HMS Belleisle* | 74 | Dismasted entirely and fought on. |
| 2 | *HMS Mars* | 74 | Captain Duff, killed by a roundshot. |

### 2.3 Deployment
- Ships are axis-aligned: horizontal or vertical only.
- Ships must lie wholly on the grid and may not overlap.
- Ships **may** touch (adjacency is legal). This is the classic rule.
- Both fleets deploy before the first shot. The AI deploys randomly at every level
  (uniform over legal layouts), with one constraint at *Nelson* level: no more than two
  ships flush against an edge, since edge-heavy layouts are weak against density search
  and Nelson would not make that mistake.
- Player deployment aids:
  - **Adopt Villeneuve's Formation** — a fixed layout evoking the ragged Combined Fleet
    line: a broken crescent running north–south, the two largest ships in the centre.
    Deterministic, and therefore a known-weak layout against the *Nelson* AI. The
    tooltip says so, in period voice.
  - **Randomise** — uniform random legal layout.
  - Manual: click to select a ship, click a cell to place its bow, `R` or right-click to
    rotate, drag to reposition. Illegal targets refuse the drop and are shown in oxblood.

### 2.4 Turn order and firing
1. The player fires first. (Historically the British opened the action, but the player is
   the protagonist, and moving first is the weaker seat in Battleship — a fair handicap
   given the player also chooses the difficulty.)
2. A turn is exactly one shot at one cell that the firing side has not already fired at.
3. Resolution is deterministic and immediate:
   - **Miss** — no ship occupies the cell.
   - **Hit** — a ship occupies the cell and the ship still has unhit cells elsewhere.
   - **Sunk** — the shot was a hit and it was that ship's last unhit cell. The sinking is
     announced, including the ship's name, to both sides. Ship *positions* are never
     revealed by a sinking, only the name — standard rules.
4. Turn passes to the other side regardless of outcome. There is no extra shot on a hit.
5. First side to sink all five enemy ships wins. Ties are impossible: the player fires
   first, so if the player's 17th successful hit lands, the game ends before the AI
   replies.

### 2.5 Victory
- **Player victory:** all five British ships sunk. History rewritten.
- **AI victory:** all five Franco-Spanish ships sunk. History repeats.
- The aftermath screen states the result, the shot count, accuracy, which ships were
  lost, and a short historical coda contrasting the outcome with the real one.

### 2.6 Optional rule — "The Death of Nelson" (default OFF)
A toggle on the deployment screen: if enabled, sinking *HMS Victory* wins the game
immediately, regardless of the other four British ships. It is a real tactical shortcut
(the Combined Fleet's best hope was to decapitate the British command) but it is not
classic Battleship, so it ships off by default and is labelled as a variant.
Independently of the toggle, sinking *Victory* always produces the game's loudest
dispatch line.

---

## 3. AI

Three levels. All three are pure functions of the shot history, so they are trivially
unit-testable and cannot cheat: **no AI level ever reads the player's ship positions.**
This is enforced by the function signature — the AI receives only its own view of the
player's grid (`CellState[]`, values `unknown | miss | hit`), the list of enemy ships
already sunk, and its own difficulty.

### 3.1 Midshipman
Uniform random choice among cells never fired at. Expected ~95 shots to win. Loses to
almost any human.

### 3.2 Captain (hunt / target)
The algorithm most people play by hand.
- **Hunt:** uniform random among unfired cells.
- **Target:** on a hit, push the four orthogonal neighbours onto a LIFO target queue
  (skipping off-grid and already-fired cells). While the queue is non-empty, fire from it.
- **Direction locking:** with two or more collinear hits in an unresolved cluster, restrict
  to that line and extend it in both directions before trying anything else.
- When a ship sinks, discard queued cells that belonged only to that ship's cluster.
- Expected ~65 shots. Beatable, but it punishes clustered layouts.

### 3.3 Nelson (probability density + parity)
Near-optimal. Measured at ~46 shots against a random layout over 300 seeded games;
published optimal play is about 41.
- For each enemy ship not yet sunk, enumerate every legal placement (both orientations,
  every offset) that is consistent with the current view: no cell of the placement may be
  a `miss`, and no cell may belong to an already-sunk ship's resolved footprint.
- Increment a density counter for every `unknown` cell covered by each consistent
  placement. Ships are weighted equally; longer ships naturally contribute more mass.
- **Hit-seeking bonus:** any placement that covers an existing unresolved `hit` has its
  contribution multiplied (factor 8). This makes the same routine handle both the hunt
  and the target phase — no separate mode — and makes it finish wounded ships fast.
- **Parity:** while no unresolved hits exist, restrict candidate cells to those where
  `(x + y) mod m == 0`, with `m` the length of the smallest surviving enemy ship. No ship
  of length `m` can hide entirely between such cells, so this halves (or better) the
  search cost with zero loss of information.
- Fire at the maximum-density cell; ties broken by a seeded PRNG so games are varied but
  reproducible from the seed.

### 3.4 Difficulty presentation
Chosen on the title screen, described in period voice, and fixed for the game:
- *Midshipman* — "A boy of fourteen with a telescope he cannot hold steady."
- *Post-Captain* — "A competent officer. He will find you, and then he will finish you."
- *Nelson* — "He does not guess. History says you lose." (default)

---

## 4. State machine

```
title ──► preamble ──► deployment ──► battle ──► aftermath ──► (title | rematch)
   │          │                          │
   └──────────┴── skip ──► deployment    └── resign ──► aftermath
```

`battle` sub-states: `awaitingPlayerShot → resolvingPlayerShot → aiThinking →
resolvingAiShot → awaitingPlayerShot`. Resolution states exist so the UI can hold a beat
(≈650 ms of smoke) before the log line lands; input is locked outside
`awaitingPlayerShot`.

Single reducer, one immutable state object:

```ts
type Phase = 'title' | 'preamble' | 'deployment' | 'battle' | 'aftermath'

interface GameState {
  phase: Phase
  difficulty: Difficulty
  deathOfNelson: boolean          // optional rule
  player: FleetState              // ships + shots taken against it
  enemy: FleetState
  turn: 'player' | 'ai'
  battleSub: BattleSub
  log: Dispatch[]                 // newest first, capped at 200
  aiMemory: AiMemory              // target queue / seed, opaque to the UI
  winner: 'player' | 'ai' | null
  seed: number
}
```

Actions: `BEGIN`, `ENTER_DEPLOYMENT`, `SET_DIFFICULTY`, `TOGGLE_VARIANT`, `TOGGLE_SOUND`,
`SELECT_SHIP`, `SET_ORIENTATION`, `PLACE_SHIP`, `ROTATE_SHIP`, `RANDOMISE`,
`ADOPT_FORMATION`, `CONFIRM_DEPLOYMENT`, `FIRE`, `RESOLVE`, `AI_FIRE`, `RESIGN`, `REMATCH`,
`NEW_GAME`.

Rules live in pure functions in `src/game/`, entirely free of React. The UI renders state
and dispatches actions; it contains no rules.

---

## 5. Art direction

Restraint is the whole brief. If it looks like a mobile game, it is wrong.

- **Palette:** aged canvas `#e8dcc4`, ink `#241f1a`, Prussian blue `#1e3a5f`, oxblood
  `#6b2325`, brass `#b08d4f`, powder-smoke grey `#9aa0a0`.
- **Type:** Cormorant Garamond for display and dispatches; a plain system serif fallback.
  Small caps for grid labels and ship names. No rounded sans anywhere.
- **Sea:** paper/canvas texture rendered as CSS gradients plus an SVG noise filter — no
  raster assets, so nothing to load and nothing to license. The grid is a thin ink
  hairline, as if ruled on a chart.
- **Ships:** ink silhouettes in plan view, not sprites. A ship is a tapered hull outline
  with mast dots.
- **Hits:** a spreading smoke stain (SVG turbulence, opacity animated over 600 ms) and a
  small oxblood cross. **Misses:** a faint grey ring, like a splash seen from a masthead.
  No particles, no screen shake, no flashes.
- **Sinking:** the ship's silhouette rotates a few degrees and fades to a stain; the
  aftermath list rules a line through her name.
- **Motion:** 200–650 ms, ease-out, opacity and small transforms only. Everything is
  disabled under `prefers-reduced-motion`.
- **Sound:** on by default, one toggle governing everything — the guns, a sinking, and
  the closing anthem. Three clips only: our cannon at full weight, theirs at a distance,
  and timber and water as a ship goes down. Silence between them is the atmosphere.

---

## 6. Flavour text

A **signal log** sits beside the boards, newest line first, monospaced-serif, prefixed
with a signal number. Lines are short. The history does the work.

- Preamble (one screen, skippable, `Enter` to advance): Boulogne, the 200,000 men, the
  Napoleon quote — *"Let us be masters of the Strait for six hours, and we shall be
  masters of the world."* — then the real outcome (33 ships to 27; 22 lost to none), then
  the mission: *rewrite that afternoon*.
- Miss: *"Shot fell short. The swell is heavy off Cape Trafalgar."* (one of ~8 variants,
  no immediate repeats)
- Hit: *"Ball struck home. Splinters on her gundeck."*
- Player sinks a ship: *"HMS Belleisle is dismasted and struck. Four of the line remain."*
- Player sinks *Victory*: *"Victory is gone. Nelson is down. Signal the fleet."*
- AI sinks a ship: *"Santa Ana has struck her colours."*
- Defeat: the real coda — Villeneuve captured, later dead by his own hand at Rennes; the
  invasion abandoned.
- Victory: the counterfactual, stated plainly and without triumphalism — the Strait open,
  the Grande Armée at Boulogne still waiting for its six hours.

Every string lives in `src/content/dispatches.ts`. No copy is embedded in components.

---

## 7. Technical

- **Stack:** Vite 8, React 19, TypeScript 6 (strict), oxlint, no UI framework and no state
  library. Plain CSS with custom properties. Runtime dependencies: React plus two
  self-hosted `@fontsource` families, nothing else.
- **Tests:** Vitest. Logic only, no component snapshots.
  - placement legality, overlap, bounds, rotation
  - shot resolution: miss / hit / sunk / duplicate-shot rejection
  - victory detection, including the `deathOfNelson` variant
  - AI: never repeats a shot; never reads hidden state; `Captain` finishes a wounded ship;
    `Nelson` respects parity while hunting and always fires a legal cell
  - **statistical harness:** 200 seeded games per level, asserting mean shots to victory
    falls in the expected band (Midshipman > 85, Captain 50–80, Nelson 36–52) and that each
    level beats the one below it. This is the real regression test for the AI.
    Measured: 95.2 / 61.4 / 46.0.
- **Quality gates:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- **Accessibility:** the board is a real grid of `<button>`s with labels like
  "B7, unfired"; full keyboard play with arrows and `Enter`; visible focus ring in brass;
  log is an `aria-live="polite"` region; contrast checked against the canvas background.
- **Determinism:** all randomness goes through one seeded PRNG (mulberry32). A game is
  reproducible from `seed` alone, which is what makes the statistical harness meaningful.

### File layout
```
src/
  game/
    types.ts          Cell, Ship, FleetState, GameState, Difficulty
    fleets.ts         the two historical fleets
    board.ts          placement legality, random + Villeneuve layouts
    resolve.ts        fireAt(), sink detection, victory
    reducer.ts        the state machine
    rng.ts            mulberry32
    ai/
      index.ts        chooseShot(view, sunk, difficulty, memory)
      midshipman.ts
      captain.ts
      nelson.ts       density + parity
  content/
    dispatches.ts     every string
    history.ts        preamble and coda copy
  components/
    Title, Preamble, Deployment, Battle, Grid, Cell, ShipRoster, SignalLog, Aftermath
  styles/
    tokens.css, app.css
```

### Deployment
- Vercel, static output from `vite build`.
- `vercel.json`:
  - `/assets/*` → `Cache-Control: public, max-age=31536000, immutable` (safe: Vite
    content-hashes these filenames).
  - `/index.html` and `/` → `Cache-Control: public, max-age=0, must-revalidate` so a new
    deploy is picked up on the next load rather than being served stale from cache.
  - Security headers: `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`,
    `X-Frame-Options: SAMEORIGIN`, and a CSP tight enough to matter given there is no
    backend (`default-src 'self'`, no `unsafe-eval`).
  - SPA rewrite to `/index.html` (single route today, but harmless and future-proof).

---

## 8. Phases

| Phase | Content | Gate |
|---|---|---|
| 0 | Spec (this document) | Signed off |
| 1 | Scaffold, tokens, types, fleets | `vite build` passes |
| 2 | Board + resolution + reducer, with tests | Vitest green |
| 3 | Three AIs + statistical harness | Shot-count bands hold |
| 4 | UI: title, preamble, deployment, battle, aftermath | Full game playable |
| 5 | Oil-painting pass: texture, ink ships, smoke, sound | Looks like a painting |
| 6 | a11y, keyboard play, reduced motion, responsive | Playable by keyboard alone |
| 7 | `vercel.json`, deploy, public link | Link live and verified |

## 9. Open questions
1. **"The Death of Nelson" variant** — shipping as an off-by-default toggle. Say the word
   and it becomes the default rule, or gets cut entirely.
2. **Who fires first** — spec says the player. Historically the British opened the
   action; if realism should win over playability, this flips.
