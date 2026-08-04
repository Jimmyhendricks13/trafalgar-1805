# Debugging log

Nine defects found and fixed while building this game, with the root cause of each.
They are grouped by how they were caught, because that turned out to be the more
interesting story: the bugs that mattered were not the ones a test suite finds.

Live game: <https://dist-mestpyyt.devinapps.com>

## How bugs were found

Four mechanisms, in ascending order of how much they actually caught:

1. **Unit tests** (42, in `src/game/`). These cover placement legality, shot
   resolution, the reducer's state machine and AI targeting. They caught mistakes
   while the rules were being written and have prevented regressions since, but
   they found none of the nine bugs below — every one of them lives in the seam
   between correct game state and what the player is shown.
2. **A statistical harness** (`src/game/simulate.ts`). Battleship AI cannot be
   asserted on directly: a single game proves nothing. Instead each admiral plays
   hundreds of seeded games and is checked against a shot-count band — a random
   firer needs ~95 shots to clear the board, a hunt/target firer ~61, the
   probability-density firer ~46. This is the only meaningful regression test for
   targeting quality, and it also asserts invariants that would otherwise be
   invisible: the AI never fires twice at the same cell, and never runs out of
   cells while a ship is still afloat.
3. **Automated code review** on each pull request. Caught four of the nine, all of
   them in React effect scheduling — the class of bug that is easy to reason about
   from the code and nearly impossible to notice by playing.
4. **Adversarial runtime testing in a real browser** — driving the UI while
   instrumenting the DOM, audio playback and animation timings. Caught the other
   five, including two that only appear if you deliberately misuse the interface.

## The bugs

### 1. Your own shot's result was announced before it happened

**Symptom.** A sinking was reported in the Signal Log, with its cannon report,
the instant you clicked — before the shot animation had run. The AI's shots were
correctly held back, so the asymmetry was easy to miss.

**Root cause.** The log is gated on a `revealed` id: only dispatches numbered at
or below it are shown. The idle branch of the timing effect set
`revealed = state.nextDispatchId`, but `nextDispatchId` is the id the *next*
dispatch will be given, not the last one issued. So the gate was always one line
ahead of reality, and any dispatch created by your click was already permitted.

**Fix.** `setRevealed(state.nextDispatchId - 1)` — reveal only dispatches that
exist. One character of intent, and the whole ordering guarantee depended on it.

**Caught by** automated review. Playing the game did not reveal it, because a
gate that is one line too permissive looks exactly like a gate that works until
you specifically watch the ordering of a sinking.

### 2. "Rotate (R)" did nothing, in two different ways

**Symptom.** During deployment, the Rotate button sometimes had no visible
effect. The `R` key and right-click always worked.

**First diagnosis, which was wrong.** The obvious explanation was that the button
never dispatched the rotate action. It did. Reproducing it in a browser showed
the button rotating a selected ship correctly.

**Actual root cause.** Two separate silent no-ops sharing one symptom:

- With no ship selected, the button only flipped a hidden "heading for the next
  placement" value. Nothing on the board moved, because nothing was chosen.
- With a ship selected but no sea room, the reducer legally *refused* the
  rotation — turning the ship would have run her off the board or fouled a
  neighbour — and returned the state unchanged, with no feedback.

So the rules were right and the interface was lying: a control that promises an
action must never fail in silence.

**Fix.** The button now disables itself and says which case applies — "Select a
ship to bring her about" or "No sea room to bring her about" — and the heading
note reads off the selected ship rather than a global value. No rules changed.

**Caught by** adversarial browser testing, which reported the symptom; the real
cause only emerged by refusing to accept the first plausible explanation.

### 3. Every wreck flew a British ensign

**Symptom.** A sunk Franco-Spanish ship flew an oxblood (British) ensign instead
of blue. Correct while afloat, wrong the moment she sank.

**Root cause.** CSS specificity, exactly equal. The rule colouring a sunk ship's
ensign had the same specificity as the two rules colouring each fleet's ensign,
and appeared later in the file, so it won for both sides.

**Fix.** Scope the sunk rule per fleet instead of globally, so a wreck keeps her
own colours, faded.

**Caught by** adversarial browser testing. Worth noting because it is the kind of
defect no test suite in this project could have caught: the DOM was correct, the
component was correct, and the bug existed only in the cascade.

### 4. Muting mid-shot fired a second cannonball

**Symptom.** Pressing the audible/silent toggle while a shot was in the air
replayed the cannon report and sent a second ball across the board.

**Root cause.** The effect that fires the gun and launches the flight listed
`state.soundOn` in its dependency array — it needed to know whether sound was on
— and had no guard against re-running for a shot already resolved. Because the
resolving state persists through the flight, the impact beat and the kill-cam
hold (up to ~1.6s), any toggle in that window re-ran the effect body.

**Fix.** `soundOn` is read through a ref: consulted when a gun speaks, never a
reason for one to speak. A React dependency array answers "when should this run
again?", not "what does this need?", and conflating the two is a recurring trap.

**Caught by** automated review.

### 5. A phantom cannonball in the next game

**Symptom.** Strike your colours while the enemy's shot is in the air, start a
new game, and a stray ball crossed your own board — with one cell blanked and the
board briefly unclickable.

**Root cause.** The in-flight shot was only ever cleared by its own landing
callback. If the component unmounted mid-arc, that callback never ran, so the
flight survived the phase change and was re-rendered when a new battle mounted.

**Fix.** Clear the flight when leaving the battle screen.

**Caught by** automated review; confirmed in the browser afterwards by resigning
with a genuinely airborne shot.

### 6. Your ships sank a beat before the shot arrived

**Symptom.** When the enemy landed a killing blow, your ship rolled over as a
wreck and the fleet table read "lost" a fraction of a second *before* the ball
reached her.

**Root cause.** The animation deliberately withholds a cell's result until the
shot lands, and the enemy's wrecks were filtered accordingly — but only the enemy's.
Your own wreck list was unfiltered, and the fleet status table asked the rules
directly whether each ship was sunk, bypassing the veil entirely.

**Fix.** Filter both sides identically, and pass the already-filtered wreck list
into the status table so the board and the table cannot disagree. Two views of
one fact should not each compute it.

**Caught by** automated review.

### 7. A rematch could silently skip a kill cam

**Symptom.** Rare and near-impossible to notice: in a second game, one of your
sinkings would not zoom in on the wreck.

**Root cause.** The kill cam plays once per sinking, tracked by remembering the
dispatch id already used. Dispatch ids restart at 1 for each new game, so a kill
in the second game could inherit an id that had already been marked as seen.

**Fix.** Clear that memory when leaving the battle screen. Cross-game state in a
ref that is not reset is a bug waiting for a coincidence.

**Caught by** automated review.

### 8. The sinking sound played twice

**Symptom.** Two plays of the sinking clip per sinking — the first at the moment
of firing, before the shot had even landed.

**Root cause.** The most subtle bug in the project. The effect that plays the
sinking guards on `if (flight) return` — do not sound a sinking while the shot is
still in the air. But both effects run in the *same* commit after a shot is
fired, and the flight is set by the earlier one via `setState`, which does not
update the value the later effect is reading. So the guard was looking at `null`,
played the sound, and then played it again on impact once the flight had properly
cleared.

**Fix.** A ref marks the shot airborne synchronously as the gun fires, and the
sinking effect guards on the ref as well as the state. The general lesson: a
guard that reads state written earlier in the same commit is not a guard.

**Caught by** browser instrumentation that counted `play()` calls and timestamped
them against the landing. It is inaudible — two copies of the same clip 400ms
apart just sound like a longer sinking — so only measurement found it.

### 9. Smoke obscured the wreck it was meant to dress

**Symptom.** Sunk ships were drawn with drifting smoke over them, which made the
hull underneath unreadable — the one moment the game shows you what you destroyed.

**Root cause.** Opacity and stacking chosen for the smoke in isolation rather than
against the artwork behind it.

**Fix.** Lower the smoke's opacity and let the hull read through it.

**Caught by** looking at a screenshot of the finished feature instead of trusting
that each part worked.

## What the process taught

- **The tests and the bugs did not overlap.** 42 unit tests, and none of them
  caught any of these nine. That is not an argument against the tests — they made
  the rules trustworthy enough that every bug above could be diagnosed as a
  *presentation* bug — but it is a reminder that a green suite says nothing about
  whether the game is right.
- **Two of the nine had a wrong first diagnosis** (#2 above, and one where a
  reported "the Rotate button doesn't dispatch" turned out to be the rules
  correctly refusing an illegal move). Both times the correct answer came from
  reproducing the behaviour and measuring it, not from reading the code and
  reasoning about what *should* be wrong. The temptation to fix the first
  plausible cause is the most expensive habit in debugging: it produces a commit,
  a green suite, and a bug that is still there.
- **Silence is a bug.** #2 and #7 were both cases of a system doing exactly what
  it was told and telling nobody. Refusing an action correctly is only half the
  work.
- **Most of these were timing bugs, and timing bugs are found by measuring.**
  Counting DOM nodes and audio `play()` calls, and timestamping them against each
  other, found things that watching the screen could not.
