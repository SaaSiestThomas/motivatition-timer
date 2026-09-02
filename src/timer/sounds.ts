// Synthesized flip sounds via the Web Audio API. No audio assets needed.
//
// Two distinct, sub-0.5s signals so you can tell a Work-start from a Fun-start with your
// eyes closed: a calm sine pair for Work, a bright ascending arcade run for Fun.
//
// Browsers require a user gesture to unlock audio, so call `unlock()` from the first
// Start tap before any sound is expected to play. Call `release()` when the timer stops.
//
// iOS notes — the reason this file is more than four lines:
//   1. Web Audio on iOS defaults to an "ambient" audio session, which the hardware
//      ringer switch silences outright (WebKit bug 237322). A phone on silent plays
//      nothing at all. `navigator.audioSession.type = "playback"` opts into a session
//      that ignores the ringer switch. Safari 16.4+.
//   2. `resume()` is async, and a context created inside a tap is still "suspended" for
//      a beat afterwards, so tones scheduled immediately can be dropped. We resume
//      first and schedule in the `then`.
//   3. WebKit adds an "interrupted" context state (phone call, Siri, backgrounded tab)
//      that plain `state === "suspended"` checks miss.

import type { Mode } from "./timerEngine";

type AudioContextClass = typeof AudioContext;

type AudioSessionType =
  | "auto"
  | "playback"
  | "transient"
  | "transient-solo"
  | "ambient"
  | "play-and-record";

let ctx: AudioContext | null = null;
let primed = false;

function getAudioContextClass(): AudioContextClass | null {
  const w = window as unknown as {
    AudioContext?: AudioContextClass;
    webkitAudioContext?: AudioContextClass;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Declare how this page's audio should behave. Safari-only today; a no-op elsewhere,
 * where Web Audio is not gagged by a hardware switch in the first place.
 */
function setSessionType(type: AudioSessionType): void {
  const session = (navigator as unknown as { audioSession?: { type: AudioSessionType } })
    .audioSession;
  if (!session) return;
  try {
    session.type = type;
  } catch {
    // Partial implementations may reject some values; the tones still work when the
    // ringer is on, so there is nothing to fall back to.
  }
}

/** Nudge the context back to "running" from suspended or WebKit's "interrupted". */
function resumeCtx(): Promise<void> {
  if (!ctx) return Promise.resolve();
  if (ctx.state === "running") return Promise.resolve();
  return ctx.resume().catch(() => {});
}

/**
 * Open the hardware audio route while we still hold the user gesture, by playing an
 * inaudible blip. Without this the very first flip tone is often swallowed on iOS.
 */
function prime(): void {
  if (!ctx || primed) return;
  primed = true;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

/** Create/resume the AudioContext. Must be called from within a user gesture. */
export function unlock(): void {
  setSessionType("playback");
  if (!ctx) {
    const AC = getAudioContextClass();
    if (!AC) return;
    ctx = new AC();
  }
  void resumeCtx().then(prime);
}

/**
 * Hand the audio session back when the timer is not running, so a paused/stopped timer
 * stops holding the device's playback slot.
 */
export function release(): void {
  setSessionType("auto");
  if (ctx && ctx.state === "running") void ctx.suspend().catch(() => {});
}

/** Re-acquire audio after the tab comes back to the foreground. */
export function refresh(): void {
  if (!ctx) return;
  setSessionType("playback");
  void resumeCtx();
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gainVal: number,
): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function schedule(mode: Mode): void {
  // A small lead so a context that has only just resumed does not drop the first note.
  const lead = 0.02;
  if (mode === "fun") {
    // bright, punchy, ascending arcade run
    tone(523, lead, 0.08, "square", 0.14);
    tone(659, lead + 0.07, 0.08, "square", 0.14);
    tone(880, lead + 0.14, 0.13, "square", 0.16);
  } else {
    // calm, mellow two-note
    tone(392, lead, 0.17, "sine", 0.22);
    tone(294, lead, 0.19, "sine", 0.1);
  }
}

/** Play the flip signal for the mode being entered. No-op if muted or not unlocked. */
export function playFlip(mode: Mode, muted: boolean): void {
  if (muted || !ctx) return;
  if (ctx.state === "running") {
    schedule(mode);
    return;
  }
  // Suspended or interrupted: resume first, then schedule, or the notes are discarded.
  void resumeCtx().then(() => schedule(mode));
}
