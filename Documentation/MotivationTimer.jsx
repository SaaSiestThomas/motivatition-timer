import { useState, useEffect, useRef, useCallback } from "react";

const WORK_BG = "#0E4F5C";   // deep, focused teal
const FUN_BG = "#FF3399";    // hot pink, energetic
const WORK_MIN_MAX = [1, 60];
const FUN_MIN_MAX = [1, 30];

export default function MotivationTimer() {
  const [workMin, setWorkMin] = useState(10);
  const [funMin, setFunMin] = useState(10);
  const [mode, setMode] = useState("work");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [demoSpeed, setDemoSpeed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pulse, setPulse] = useState(0);

  const endTimeRef = useRef(0);
  const remainingRef = useRef(0);
  const audioRef = useRef(null);

  // mirror state into refs so the interval reads the latest values
  const workMinRef = useRef(workMin);
  const funMinRef = useRef(funMin);
  const modeRef = useRef(mode);
  const mutedRef = useRef(muted);
  const demoRef = useRef(demoSpeed);
  useEffect(() => { workMinRef.current = workMin; }, [workMin]);
  useEffect(() => { funMinRef.current = funMin; }, [funMin]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { demoRef.current = demoSpeed; }, [demoSpeed]);

  const unitMs = useCallback(() => (demoRef.current ? 1000 : 60000), []);

  // ---- audio ----
  const ensureAudio = () => {
    if (!audioRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioRef.current = new AC();
    }
    if (audioRef.current && audioRef.current.state === "suspended") {
      audioRef.current.resume();
    }
  };
  const tone = (freq, start, dur, type, gainVal) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    const t0 = ctx.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  };
  const playFlip = (m) => {
    if (mutedRef.current || !audioRef.current) return;
    if (m === "fun") {
      // bright, punchy, arcade ascending
      tone(523, 0, 0.08, "square", 0.14);
      tone(659, 0.07, 0.08, "square", 0.14);
      tone(880, 0.14, 0.13, "square", 0.16);
    } else {
      // calm, mellow two-note
      tone(392, 0, 0.17, "sine", 0.22);
      tone(294, 0, 0.19, "sine", 0.1);
    }
  };
  const vibrate = (m) => {
    if (navigator.vibrate) navigator.vibrate(m === "fun" ? [30, 40, 30] : [45]);
  };

  // ---- timer tick ----
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => {
      const remaining = endTimeRef.current - Date.now();
      if (remaining <= 0) {
        const fromWork = modeRef.current === "work";
        const newMode = fromWork ? "fun" : "work";
        if (fromWork) setCycleCount((c) => c + 1);
        const dur = (newMode === "work" ? workMinRef.current : funMinRef.current) * unitMs();
        endTimeRef.current = Date.now() + dur;
        modeRef.current = newMode;
        setMode(newMode);
        setPulse((p) => p + 1);
        playFlip(newMode);
        vibrate(newMode);
      }
      setNow(Date.now());
    }, 200);
    return () => clearInterval(id);
  }, [running, paused, unitMs]);

  // ---- controls ----
  const start = () => {
    ensureAudio();
    const dur = workMin * unitMs();
    modeRef.current = "work";
    setMode("work");
    setCycleCount(0);
    endTimeRef.current = Date.now() + dur;
    setRunning(true);
    setPaused(false);
    setPulse((p) => p + 1);
    playFlip("work");
    vibrate("work");
    setNow(Date.now());
  };
  const pause = () => {
    remainingRef.current = Math.max(0, endTimeRef.current - Date.now());
    setPaused(true);
  };
  const resume = () => {
    endTimeRef.current = Date.now() + remainingRef.current;
    setPaused(false);
    setNow(Date.now());
  };
  const reset = () => {
    setRunning(false);
    setPaused(false);
    modeRef.current = "work";
    setMode("work");
    remainingRef.current = 0;
    setCycleCount(0);
  };
  const addMinute = () => {
    const u = unitMs();
    if (running && !paused) endTimeRef.current += u;
    else if (running && paused) remainingRef.current += u;
    setNow(Date.now());
  };

  // ---- derived display ----
  let displayMs;
  if (!running) displayMs = (mode === "work" ? workMin : funMin) * unitMs();
  else if (paused) displayMs = remainingRef.current;
  else displayMs = Math.max(0, endTimeRef.current - now);
  const totalSec = Math.ceil(displayMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  const bg = mode === "work" ? WORK_BG : FUN_BG;
  const clampVal = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

  const pill =
    "rounded-full px-5 py-3 text-sm font-semibold tracking-wide bg-white/15 hover:bg-white/25 active:bg-white/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";
  const ctrlBtn =
    "rounded-2xl px-6 py-4 text-base font-bold tracking-wide bg-white text-black hover:opacity-90 active:scale-95 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50";
  const stepBtn =
    "w-12 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/35 text-2xl font-bold leading-none flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

  return (
    <div
      className="min-h-[640px] w-full flex flex-col text-white select-none"
      style={{
        backgroundColor: bg,
        transition: "background-color 120ms ease",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        @keyframes mt-pop { 0%{transform:scale(.82);opacity:.4} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        .mt-pop { animation: mt-pop 260ms cubic-bezier(.2,.9,.3,1.2); }
        @media (prefers-reduced-motion: reduce){ .mt-pop{ animation: none; } }
      `}</style>

      {/* top bar */}
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="text-xs font-bold tracking-[0.2em] uppercase opacity-80">
          {cycleCount} {cycleCount === 1 ? "round" : "rounds"} done
        </div>
        <div className="flex gap-2">
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
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          key={`${mode}-${pulse}`}
          className="mt-pop text-center"
        >
          <div className="text-2xl font-black tracking-[0.22em] uppercase opacity-90 mb-2 pl-[0.22em]">
            {mode === "work" ? "Work Hard" : "Play Hard"}
          </div>
          <div
            className="font-black leading-none"
            style={{ fontVariantNumeric: "tabular-nums", fontSize: "clamp(5rem, 26vw, 12rem)" }}
          >
            {mm}:{ss}
          </div>
        </div>

        <button
          className={`${pill} mt-6 ${!running ? "opacity-40 pointer-events-none" : ""}`}
          onClick={addMinute}
          aria-label="Add one minute to the current interval"
        >
          I'm in flow, give me more
          <span className="opacity-60 ml-2">+1 min</span>
        </button>
      </div>

      {/* primary controls */}
      <div className="flex items-center justify-center gap-3 px-6">
        {!running ? (
          <button className={ctrlBtn} onClick={start}>Start</button>
        ) : (
          <button className={ctrlBtn} onClick={paused ? resume : pause}>
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          className={`${ctrlBtn} bg-white/20 text-white`}
          onClick={reset}
        >
          Reset
        </button>
      </div>

      {/* dials */}
      <div className="px-6 py-6 mt-4 bg-black/15">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Dial
            label="Work Hard"
            value={workMin}
            onChange={(v) => setWorkMin(clampVal(v, WORK_MIN_MAX))}
            stepBtn={stepBtn}
          />
          <Dial
            label="Play Hard"
            value={funMin}
            onChange={(v) => setFunMin(clampVal(v, FUN_MIN_MAX))}
            stepBtn={stepBtn}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest uppercase opacity-70 mr-1">Quick</span>
          <button className={pill} onClick={() => { setWorkMin(10); setFunMin(10); }}>10 / 10</button>
          <button className={pill} onClick={() => { setWorkMin(10); setFunMin(5); }}>10 / 5</button>
        </div>

        {running && (
          <div className="text-xs opacity-70 mt-3">
            Dial changes take effect next time that mode comes around. Use +1 min to stretch the current one.
          </div>
        )}
      </div>
    </div>
  );
}

function Dial({ label, value, onChange, stepBtn }) {
  return (
    <div className="flex-1 bg-white/10 rounded-2xl p-3">
      <div className="text-xs font-bold tracking-widest uppercase opacity-80 mb-2 text-center">
        {label}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button className={stepBtn} onClick={() => onChange(value - 1)} aria-label={`Decrease ${label} time`}>−</button>
        <div className="min-w-[5.5rem] text-center">
          <span className="text-3xl font-black" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
          <span className="text-sm font-semibold opacity-70 ml-1">min</span>
        </div>
        <button className={stepBtn} onClick={() => onChange(value + 1)} aria-label={`Increase ${label} time`}>+</button>
      </div>
    </div>
  );
}
