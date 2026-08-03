# Trafalgar — 21 October 1805

Battleship, reskinned as the Battle of Trafalgar. You command Villeneuve's Franco-Spanish
Combined Fleet; the AI commands Nelson's Royal Navy. History says you lose.

The rules are classic Battleship: two 10×10 grids, five ships of 5/4/3/3/2 cells,
alternating single shots, hit / miss / sunk. Ships may touch but not overlap. The dressing
is historical; the mechanics are not novel.

**Play it: <https://dist-mestpyyt.devinapps.com>**

Read [`spec.md`](./spec.md) first — it is the source of truth for rules, AI behaviour, art
direction and phasing. [`BUGS.md`](./BUGS.md) is the debugging log: the nine defects found
while building it, what caused each one, and how it was caught.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # logic + AI statistical harness
npm run typecheck
npm run lint
npm run build      # static output in dist/
```

No backend, no accounts, no persistence. State lives in one reducer for the lifetime of the
tab.

## The AI

Three levels, all in `src/game/ai/`. Each is a pure function of the AI's *own* view of your
waters (`unknown | miss | hit`) plus the lengths of your surviving ships, which is public
information since both fleets are named. It is therefore incapable of cheating by
construction — there is no code path from the AI to your ship positions.

| Level | Method | Mean shots to sink a fleet |
|---|---|---|
| Midshipman | uniform random | ~95 |
| Post-Captain | hunt / target with direction locking | ~61 |
| Nelson | probability density over all consistent placements, plus parity search | ~46 |

`shotsToVictory` in `src/game/simulate.ts` plays a level against a random layout and returns
the shot count; the tests assert each level's mean falls in its expected band over 200
seeded games. That harness, not the unit tests, is what catches a regression in targeting
quality. Optimal play is about 41 shots.

All randomness runs through one seeded mulberry32 PRNG, so any game is reproducible from
its seed.

## Deployment

Static build, deployable anywhere. `vercel.json` sets long-lived immutable caching for
Vite's content-hashed `/assets/*`, `must-revalidate` on `index.html` so a deploy takes
effect on the next load, and a strict CSP (no backend, no external origins — the fonts are
self-hosted and the paper texture is an inline SVG filter).

## Audio

Three sounds in action and no more: our guns, theirs at 40% and a beat later, and a ship going
down. Nothing plays between them. All clips are public-domain recordings from Wikimedia Commons,
trimmed, mono, 96 kbps, and the `Cannon: audible/silent` control in the battle header silences
the guns and the closing anthems alike:

- `public/audio/cannon.mp3` — [Explosion](https://commons.wikimedia.org/wiki/File:Explosion-LS100155.ogg)
- `public/audio/sinking.mp3` — [Boat by a wharf](https://commons.wikimedia.org/wiki/File:Boat_by_a_wharf_3.ogg)
- `public/audio/la-marseillaise.mp3` — [La Marseillaise](https://commons.wikimedia.org/wiki/File:La_Marseillaise.ogg)
- `public/audio/god-save-the-king.mp3` — [U.S. Navy Band, God Save the King](https://commons.wikimedia.org/wiki/File:U.S._Navy_Band_-_God_Save_the_King.oga)

## Historical note

The ships are real and present at the battle: *Santísima Trinidad* (136 guns, the largest
warship in the world), Villeneuve's *Bucentaure*, *Santa Ana*, *Redoutable* — whose musketry
killed Nelson — and *Achille*, against *Victory*, *Royal Sovereign*, *Téméraire*,
*Belleisle* and *Mars*. Lengths are assigned by rate. The optional "Death of Nelson" rule,
off by default, ends the game the moment *Victory* goes down.
