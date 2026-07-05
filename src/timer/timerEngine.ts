// UI-free timer logic for Motivation Timer.
//
// This module knows nothing about React, the DOM, audio, or styling, so it can be
// reused as-is when the app is later wrapped for iOS. Everything here is pure: each
// helper takes the current state plus the current time and returns a fresh state.
//
// Timing is timestamp-based on purpose. We store the absolute epoch ms when the current
// interval ends (`endTimestampMs`) and derive remaining time from `Date.now()` on every
// render. A naive interval that decrements a counter drifts and stalls when the browser
// tab is backgrounded, which would wreck a 10-minute timer.

export type Mode = "work" | "fun";

export interface TimerState {
  mode: Mode;
  /** Dial value for Work, in "units" (minutes in normal mode, seconds in demo mode). */
  workUnits: number;
  /** Dial value for Fun, in "units". */
  funUnits: number;
  /** Epoch ms when the current interval began at its then-current duration. */
  intervalStartMs: number;
  /** Epoch ms when the current interval ends. */
  endTimestampMs: number;
  isRunning: boolean;
  isPaused: boolean;
  /** Remaining ms, only meaningful while paused. */
  remainingMs: number;
  /** Completed Work intervals this session. */
  cycleCount: number;
}

export const WORK_RANGE = { min: 1, max: 60 } as const;
export const FUN_RANGE = { min: 1, max: 30 } as const;

/** ms per dial unit. 60000 normal (minutes), 1000 in demo mode (seconds). */
export const NORMAL_UNIT_MS = 60_000;
export const DEMO_UNIT_MS = 1_000;

export const DEFAULT_WORK_UNITS = 5;
export const DEFAULT_FUN_UNITS = 5;

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function rangeFor(mode: Mode) {
  return mode === "work" ? WORK_RANGE : FUN_RANGE;
}

function unitsFor(state: TimerState, mode: Mode): number {
  return mode === "work" ? state.workUnits : state.funUnits;
}

/** Duration of the given mode's interval in ms, for the supplied unit size. */
export function durationMs(state: TimerState, mode: Mode, unitMs: number): number {
  return unitsFor(state, mode) * unitMs;
}

export function createInitialState(): TimerState {
  return {
    mode: "work",
    workUnits: DEFAULT_WORK_UNITS,
    funUnits: DEFAULT_FUN_UNITS,
    intervalStartMs: 0,
    endTimestampMs: 0,
    isRunning: false,
    isPaused: false,
    remainingMs: 0,
    cycleCount: 0,
  };
}

/** Begin a fresh session. Always starts in Work and resets the round counter. */
export function start(state: TimerState, now: number, unitMs: number): TimerState {
  const next: TimerState = {
    ...state,
    mode: "work",
    cycleCount: 0,
    isRunning: true,
    isPaused: false,
    intervalStartMs: now,
    endTimestampMs: now + state.workUnits * unitMs,
    remainingMs: 0,
  };
  return next;
}

export function pause(state: TimerState, now: number): TimerState {
  if (!state.isRunning || state.isPaused) return state;
  return {
    ...state,
    isPaused: true,
    remainingMs: Math.max(0, state.endTimestampMs - now),
  };
}

export function resume(state: TimerState, now: number, unitMs: number): TimerState {
  if (!state.isRunning || !state.isPaused) return state;
  const endTimestampMs = now + state.remainingMs;
  // Re-anchor intervalStart so that (now - intervalStartMs) equals elapsed time within
  // the current interval. This keeps live-dial resizing correct after a resume.
  const intervalStartMs = endTimestampMs - durationMs(state, state.mode, unitMs);
  return { ...state, isPaused: false, endTimestampMs, intervalStartMs };
}

export function reset(state: TimerState): TimerState {
  return {
    ...state,
    mode: "work",
    isRunning: false,
    isPaused: false,
    remainingMs: 0,
    cycleCount: 0,
  };
}

/** Add one unit (a minute, or a second in demo mode) to the current interval. */
export function addUnit(state: TimerState, unitMs: number): TimerState {
  if (!state.isRunning) return state;
  if (state.isPaused) {
    return { ...state, remainingMs: state.remainingMs + unitMs };
  }
  return { ...state, endTimestampMs: state.endTimestampMs + unitMs };
}

/**
 * Set a mode's dial duration, clamped to its range.
 *
 * Live behavior (per product decision): if the timer is actively running (not paused)
 * and the changed mode is the one currently counting down, the change applies
 * immediately by resizing the current interval to (new total minus elapsed). If that
 * pushes the end into the past, the next tick will flip at once. Changing the inactive
 * mode, or changing anything while stopped/paused, just stores the new value for the
 * next time that mode comes around.
 */
export function setDuration(
  state: TimerState,
  mode: Mode,
  value: number,
  unitMs: number,
): TimerState {
  const r = rangeFor(mode);
  const units = clamp(Math.round(value), r.min, r.max);
  const updated: TimerState = {
    ...state,
    workUnits: mode === "work" ? units : state.workUnits,
    funUnits: mode === "fun" ? units : state.funUnits,
  };

  const isActiveMode = mode === state.mode;
  if (updated.isRunning && !updated.isPaused && isActiveMode) {
    return {
      ...updated,
      endTimestampMs: updated.intervalStartMs + units * unitMs,
    };
  }
  return updated;
}

export interface TickResult {
  state: TimerState;
  /** True if at least one mode flip happened on this tick. */
  flipped: boolean;
  /** The mode now active after any flips (useful for signalling sound/haptics). */
  mode: Mode;
}

/**
 * Advance the timer to `now`. Flips as many times as needed to catch up (e.g. after the
 * tab was backgrounded across one or more interval boundaries) and lands on the correct
 * current mode. Each Work interval left increments the round counter.
 */
export function tick(state: TimerState, now: number, unitMs: number): TickResult {
  if (!state.isRunning || state.isPaused || now < state.endTimestampMs) {
    return { state, flipped: false, mode: state.mode };
  }

  let { mode, cycleCount, endTimestampMs } = state;
  let intervalStartMs = state.intervalStartMs;

  // Guard against a zero/negative duration (e.g. a dial dropped below elapsed time)
  // causing an unbounded loop: a single unit is always at least unitMs.
  while (now >= endTimestampMs) {
    const leavingWork = mode === "work";
    if (leavingWork) cycleCount += 1;
    const newMode: Mode = leavingWork ? "fun" : "work";
    intervalStartMs = endTimestampMs;
    endTimestampMs += (newMode === "work" ? state.workUnits : state.funUnits) * unitMs;
    mode = newMode;
  }

  return {
    state: { ...state, mode, cycleCount, intervalStartMs, endTimestampMs },
    flipped: true,
    mode,
  };
}

/** Remaining ms to display, valid in every state (stopped, paused, running). */
export function remainingMs(state: TimerState, now: number, unitMs: number): number {
  if (!state.isRunning) return durationMs(state, state.mode, unitMs);
  if (state.isPaused) return state.remainingMs;
  return Math.max(0, state.endTimestampMs - now);
}

/** Format milliseconds as MM:SS, rounding up so the last second shows 00:01 not 00:00. */
export function formatMMSS(ms: number): { mm: string; ss: string } {
  const totalSec = Math.ceil(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return { mm, ss };
}
