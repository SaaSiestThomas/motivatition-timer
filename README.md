# Motivation Timer

A dead-simple interval timer that flips between **Work Hard** and **Play Hard** and
loops until you stop it. Commit to a short Work interval knowing a short Play interval is
right behind it, and dial Work up on the fly as you find your flow.

Built web-first (Vite + React + TypeScript + Tailwind), installable as a PWA, with the
timer logic kept UI-free so it ports cleanly to a later iOS build via Capacitor.

## Live version

**https://saasiestthomas.github.io/motivatition-timer/**

Every push to `master` rebuilds and redeploys via `.github/workflows/deploy.yml`. Because
Pages serves the app from a sub-path, `vite.config.ts` sets `base` (and the PWA
`start_url`/`scope`) to `/motivatition-timer/` — change that constant if the app ever
moves to a host that serves it from the domain root.

## Commands

```bash
npm install
npm run icons   # rasterize public/*.svg into the PWA PNG icons (public/icons/)
npm run dev     # dev server
npm run build   # type-check + production build (also emits the service worker)
npm run preview # serve the production build
```

Run `npm run icons` once after install (and whenever the brand SVGs change); the PNGs
are generated, not committed.

## How it works

- **`src/timer/timerEngine.ts`** — pure, UI-free timer logic. Timing is timestamp-based:
  it stores the absolute end time and derives remaining time from `Date.now()` each
  render, so it never drifts or stalls when the tab is backgrounded (it even catches up
  across multiple interval boundaries). This module has no React/DOM/audio dependency so
  it can be reused as-is on iOS.
- **`src/timer/sounds.ts`** — two synthesized Web Audio flip tones (calm for Work, bright
  arcade run for Play). Unlocked on the first Start tap.
- **`src/timer/haptics.ts`** — `navigator.vibrate` on flip where supported.
- **`src/timer/useWakeLock.ts`** — keeps the screen awake while running, re-acquiring the
  lock when the tab becomes visible again.
- **`src/components/MotivationTimer.tsx`** / **`Dial.tsx`** — the single-screen UI.

### Behavior notes

- Live dial changes apply **immediately**: bumping the currently running mode's duration
  resizes the current countdown (new total minus elapsed). Dropping it below the elapsed
  time flips at once. Changing the inactive mode just applies next time it comes around.
- **+1 min** stretches the current interval for when you are in flow.
- **Demo: fast** runs the clock in seconds instead of minutes to feel the flips quickly.
  Testing only.

The original brief and mockup live in `Documentation/`.
