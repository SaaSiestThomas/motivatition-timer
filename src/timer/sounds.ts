// Synthesized flip sounds via the Web Audio API. No audio assets needed.
//
// Two distinct, sub-0.5s signals so you can tell a Work-start from a Fun-start with your
// eyes closed: a calm sine pair for Work, a bright ascending arcade run for Fun.
//
// Browsers require a user gesture to unlock audio, so call `unlock()` from the first
// Start tap before any sound is expected to play.

import type { Mode } from "./timerEngine";

type AudioContextClass = typeof AudioContext;

let ctx: AudioContext | null = null;

function getAudioContextClass(): AudioContextClass | null {
  const w = window as unknown as {
    AudioContext?: AudioContextClass;
    webkitAudioContext?: AudioContextClass;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Create/resume the AudioContext. Must be called from within a user gesture. */
export function unlock(): void {
  if (!ctx) {
    const AC = getAudioContextClass();
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
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

/** Play the flip signal for the mode being entered. No-op if muted or not unlocked. */
export function playFlip(mode: Mode, muted: boolean): void {
  if (muted || !ctx) return;
  if (mode === "fun") {
    // bright, punchy, ascending arcade run
    tone(523, 0, 0.08, "square", 0.14);
    tone(659, 0.07, 0.08, "square", 0.14);
    tone(880, 0.14, 0.13, "square", 0.16);
  } else {
    // calm, mellow two-note
    tone(392, 0, 0.17, "sine", 0.22);
    tone(294, 0, 0.19, "sine", 0.1);
  }
}
