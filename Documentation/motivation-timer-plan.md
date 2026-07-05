# Work Hard, Play Hard: Build Plan

A build specification for Claude Code. Hand this file over as the starting brief.

## Name and copy

- App name: **Work Hard, Play Hard**.
- The two modes are labelled **Work Hard** and **Play Hard** everywhere they appear on screen.
- The current-interval extend button is playful on purpose. Its label reads: **I'm in flow, give me more** with a small **+1 min** appended. Keep this voice; the humour is part of the point.
- No em dashes anywhere in UI copy.

## Concept

A dead-simple interval timer that flips between two modes, **Work Hard** and **Play Hard**, and keeps looping until you stop it. The point is psychological: instead of facing a big block of work, you commit to a short Work Hard interval, knowing a short Play Hard interval is right behind it. As work gets easier, you can dial the Work Hard time up on the fly.

This is deliberately NOT a fitness timer. No cooldowns, no rest phases, no rep counters. The transition between modes should be instant and snappy, with a punchy signal so you know it flipped without looking.

## Core behavior

1. Two modes only: **Work** and **Fun**. They alternate forever: Work, Fun, Work, Fun, until the user stops.
2. The timer always starts in Work mode.
3. When an interval hits zero, it flips immediately to the other mode and starts counting down. No gap, no confirmation tap.
4. During Fun, the app just signals "go do something fun" and counts down. It does not suggest, launch, or manage any activity. The user decides what fun is.
5. Controls: Start, Pause/Resume, Reset.

## Default durations and ranges

- Default: **Work 10 min, Fun 10 min**.
- Common alternative the user wants on tap: **Work 10, Fun 5**.
- Work duration range: 1 to 60 minutes, 1-minute steps.
- Fun duration range: 1 to 30 minutes, 1-minute steps.
- Provide quick presets as one-tap buttons: 10/10 and 10/5. Keep room to add more later.

## Dials (the adjustable part)

The user wants to adjust durations **both before starting and live while running**.

- **Before start:** two dials (or +/- steppers), one for Work, one for Fun. Big and thumb-friendly.
- **Live, while running:** the same +/- controls stay visible. Tapping them changes that mode's duration.
- **Recommended live behavior (please confirm with the user):** a live change to a duration applies to the **next** time that mode comes around, so it does not jarringly resize the countdown the user is currently watching. The current interval keeps running as-is.
  - Also add a small "+1 min" button that adds one minute to the **current** running countdown, for when the user is in flow and wants to stay a bit longer. This directly serves the "amp up Work when I feel stronger" goal.
- The current Work and Fun durations should always be visible so the user can see what they have dialed in.

## Transitions (snappy and fun)

This is where the app earns its personality. The flip should feel like a switch, not a fade.

- **Sound:** a short, punchy sound at every flip. Use two distinct sounds so the user can tell Work-start from Fun-start with eyes closed. Keep them under ~0.5s. Web Audio API, no audio files needed if you synthesize simple tones.
- **Visual:** full-screen color flip on mode change. For example a calm, focused color for Work and a bright, energetic color for Fun. Instant swap, optionally a very fast (<200ms) pop or scale animation on the mode label.
- **Mobile:** trigger a vibration on flip (navigator.vibrate on web where supported; native haptics later on iOS).
- A mute toggle for the sound.

## Screen layout (single screen)

Everything lives on one screen. No navigation needed for v1.

- Giant countdown (MM:SS), readable across a room.
- Large mode label: WORK or FUN.
- Background color reflects the current mode.
- Work and Fun duration controls (+/- steppers) with current values.
- Start / Pause / Reset.
- "+1 min" button.
- Mute toggle.
- Optional: a small cycle counter (how many Work intervals completed today).

## State model

Keep it minimal:

- `mode`: "work" or "fun"
- `workDurationSec`: number
- `funDurationSec`: number
- `endTimestamp`: epoch ms when the current interval ends (see timing note)
- `isRunning`: boolean
- `isPaused`: boolean
- `cycleCount`: number (completed Work intervals)
- `soundOn`: boolean

## Important technical notes

- **Timing must be timestamp-based, not a setInterval that decrements a counter.** Store the end time as an epoch timestamp and compute remaining time each tick from `Date.now()`. A naive decrementing interval drifts and stalls when the browser tab is backgrounded, which would wreck a 10-minute timer. Use a short interval (e.g. 250ms) only to re-render, and derive remaining time from the timestamp.
- On Pause, store the remaining milliseconds; on Resume, recompute a fresh `endTimestamp`.
- Sounds need a user gesture to unlock audio on the web. Initialize the AudioContext on the first Start tap.
- Keep the screen awake while running if feasible (Screen Wake Lock API on web).

## Recommended tech stack

Built for web first, with a clean path to iOS later.

- **React + Vite + TypeScript.** Light, fast, no heavy framework.
- No state library needed. Plain React state or a single reducer is enough.
- Web Audio API for sounds. No external audio assets required.
- CSS for the color flip and animations. No UI kit needed; keep it custom and snappy.

### Path to iOS (for later, do not build now)

- Easiest bridge: build the web app well, add a **PWA manifest** so it is installable, then wrap it with **Capacitor** to ship a real iOS app reusing nearly all the web code. Capacitor also gives native haptics and better background behavior.
- React Native is the heavier alternative and would mean rewriting the UI. Not recommended for v1 given the app is this simple.
- Structure the timer logic (the state model and tick computation) as a standalone module independent of the UI, so it ports cleanly whichever path you take.

## Suggested build phases for Claude Code

1. **Core loop.** Two modes, default 10/10, auto-flip at zero, timestamp-based countdown, Start/Pause/Reset, giant countdown display. Get the loop rock-solid first.
2. **Dials.** Work and Fun +/- steppers, before-start and live, plus the "+1 min" current-interval button and the 10/10 and 10/5 quick presets.
3. **Personality.** Two distinct flip sounds, full-screen color flip, label pop animation, vibration, mute toggle, wake lock.
4. **Polish and PWA.** Layout tuning for phone and desktop, installable PWA manifest. iOS wrapping with Capacitor comes after this, as a separate effort.

## Out of scope for v1 (note for later)

- Saved presets or per-task profiles. The user simplified down to a single Work/Fun pair for now, but presets are the natural first extension if they later want different setups for different tasks.
- Stats, history, streaks, accounts, sync.
- The Fun mode staying purely a signal. Do not add activity suggestions or launching.
