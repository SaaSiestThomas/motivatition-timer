import { useEffect, useRef, useState } from "react";
import Dial from "./Dial";
import {
  createInitialState,
  start as startTimer,
  pause as pauseTimer,
  resume as resumeTimer,
  reset as resetTimer,
  addUnit,
  setDuration,
  tick,
  remainingMs as getRemainingMs,
  formatMMSS,
  NORMAL_UNIT_MS,
  DEMO_UNIT_MS,
  type TimerState,
} from "../timer/timerEngine";
import { unlock, playFlip, release, refresh } from "../timer/sounds";
import { vibrate } from "../timer/haptics";
import { useWakeLock } from "../timer/useWakeLock";

const WORK_BG = "#0E4F5C"; // deep, focused teal
const FUN_BG = "#FF3399"; // hot pink, energetic
const TICK_MS = 200;

const pill =
  "rounded-full px-5 py-3 text-sm font-semibold tracking-wide bg-white/15 hover:bg-white/25 active:bg-white/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";
const ctrlBtn =
  "rounded-2xl px-6 py-4 text-base font-bold tracking-wide bg-white text-black hover:opacity-90 active:scale-95 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50";

export default function MotivationTimer() {
  const [state, setState] = useState<TimerState>(createInitialState);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [demoSpeed, setDemoSpeed] = useState(false);
  const [pulse, setPulse] = useState(0);

  const unitMs = demoSpeed ? DEMO_UNIT_MS : NORMAL_UNIT_MS;

  // Mirror latest state/flags into refs so the tick interval reads current values
  // without re-subscribing on every state change.
  const stateRef = useRef(state);
  const mutedRef = useRef(muted);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Keep the screen awake only while actively counting down.
  const isCountingDown = state.isRunning && !state.isPaused;
  useWakeLock(isCountingDown);

  // iOS suspends the AudioContext whenever the tab goes to the background, and does not
  // resume it on its own, so the flips would come back silent. Re-acquire on return.
  useEffect(() => {
    if (!isCountingDown) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isCountingDown]);

  const signalFlip = (mode: TimerState["mode"]) => {
    playFlip(mode, mutedRef.current);
    vibrate(mode);
    setPulse((p) => p + 1);
  };

  // Re-render loop: derive remaining time from the timestamp, and flip at the boundary.
  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;
    const id = setInterval(() => {
      const t = Date.now();
      const result = tick(stateRef.current, t, unitMs);
      if (result.flipped) {
        stateRef.current = result.state;
        setState(result.state);
        signalFlip(result.mode);
      }
      setNow(t);
    }, TICK_MS);
    return () => clearInterval(id);
    // unitMs is included so toggling demo speed restarts the loop with the new unit.
  }, [state.isRunning, state.isPaused, unitMs]);

  // ---- controls ----
  const onStart = () => {
    unlock();
    const t = Date.now();
    setState((prev) => startTimer(prev, t, unitMs));
    setNow(t);
    signalFlip("work");
  };
  const onPause = () => {
    release();
    setState((prev) => pauseTimer(prev, Date.now()));
  };
  const onResume = () => {
    unlock();
    const t = Date.now();
    setState((prev) => resumeTimer(prev, t, unitMs));
    setNow(t);
  };
  const onReset = () => {
    release();
    setState((prev) => resetTimer(prev));
  };
  const onAddMinute = () => {
    setState((prev) => addUnit(prev, unitMs));
    setNow(Date.now());
  };
  const changeWork = (value: number) =>
    setState((prev) => setDuration(prev, "work", value, unitMs));
  const changeFun = (value: number) =>
    setState((prev) => setDuration(prev, "fun", value, unitMs));
  const applyPreset = (work: number, fun: number) =>
    setState((prev) => {
      const withWork = setDuration(prev, "work", work, unitMs);
      return setDuration(withWork, "fun", fun, unitMs);
    });

  // ---- derived display ----
  const { mm, ss } = formatMMSS(getRemainingMs(state, now, unitMs));
  const isWork = state.mode === "work";
  const bg = isWork ? WORK_BG : FUN_BG;

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden text-white select-none"
      style={{
        backgroundColor: bg,
        // viewport-fit=cover means the notch and home indicator overlap the page.
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        transition: "background-color 120ms ease",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="text-xs font-bold tracking-[0.2em] uppercase opacity-80 min-w-0 truncate">
          {state.cycleCount} {state.cycleCount === 1 ? "round" : "rounds"} done
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className={pill}
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button
            className={pill}
            onClick={() => setDemoSpeed((d) => !d)}
            aria-pressed={demoSpeed}
            title="Runs the clock in seconds instead of minutes so you can feel the flips fast. Testing only."
          >
            {demoSpeed ? "Demo: fast" : "Demo: off"}
          </button>
        </div>
      </div>

      {/* center */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
        <div key={`${state.mode}-${pulse}`} className="mt-pop text-center">
          <div className="text-xl sm:text-2xl font-black tracking-[0.22em] uppercase opacity-90 mb-2 pl-[0.22em]">
            {isWork ? "Work Hard" : "Play Hard"}
          </div>
          <div
            className="font-black leading-none"
            style={{
              fontVariantNumeric: "tabular-nums",
              fontSize: "clamp(3rem, min(24vw, 17vh), 12rem)",
            }}
          >
            {mm}:{ss}
          </div>
        </div>

        <button
          className={`${pill} mt-5 shrink-0 ${!state.isRunning ? "opacity-40 pointer-events-none" : ""}`}
          onClick={onAddMinute}
          aria-label="Add one minute to the current interval"
        >
          I'm in flow, give me more
          <span className="opacity-60 ml-2">+1 min</span>
        </button>
      </div>

      {/* primary controls */}
      <div className="flex items-center justify-center gap-3 px-4">
        {!state.isRunning ? (
          <button className={ctrlBtn} onClick={onStart}>
            Start
          </button>
        ) : (
          <button className={ctrlBtn} onClick={state.isPaused ? onResume : onPause}>
            {state.isPaused ? "Resume" : "Pause"}
          </button>
        )}
        <button className={`${ctrlBtn} bg-white/20 text-white`} onClick={onReset}>
          Reset
        </button>
      </div>

      {/* dials */}
      <div className="px-4 py-4 mt-3 bg-black/15">
        <div className="flex items-stretch gap-2 mb-3">
          <Dial
            label="Work Hard"
            value={state.workUnits}
            unitLabel={demoSpeed ? "sec" : "min"}
            onChange={changeWork}
          />
          <Dial
            label="Play Hard"
            value={state.funUnits}
            unitLabel={demoSpeed ? "sec" : "min"}
            onChange={changeFun}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold tracking-widest uppercase opacity-70 mr-1">
            Quick
          </span>
          <button className={pill} onClick={() => applyPreset(5, 5)}>
            5 / 5
          </button>
          <button className={pill} onClick={() => applyPreset(10, 10)}>
            10 / 10
          </button>
          <button className={pill} onClick={() => applyPreset(15, 15)}>
            15 / 15
          </button>
        </div>
      </div>
    </div>
  );
}
