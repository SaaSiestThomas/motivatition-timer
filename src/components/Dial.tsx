interface DialProps {
  label: string;
  value: number;
  unitLabel: string;
  onChange: (value: number) => void;
}

// shrink-0 so the two dials side by side can never push each other off a narrow phone.
const stepBtn =
  "w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/35 text-2xl font-bold leading-none flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

export default function Dial({ label, value, unitLabel, onChange }: DialProps) {
  // min-w-0 lets the flex item shrink below its content width instead of overflowing.
  return (
    <div className="flex-1 min-w-0 bg-white/10 rounded-2xl p-2.5 sm:p-3">
      <div className="text-[0.65rem] sm:text-xs font-bold tracking-widest uppercase opacity-80 mb-2 text-center truncate">
        {label}
      </div>
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        <button
          className={stepBtn}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label} time`}
        >
          −
        </button>
        <div className="flex-1 min-w-0 text-center">
          <span
            className="text-2xl sm:text-3xl font-black"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          <span className="text-xs sm:text-sm font-semibold opacity-70 ml-1">
            {unitLabel}
          </span>
        </div>
        <button
          className={stepBtn}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label} time`}
        >
          +
        </button>
      </div>
    </div>
  );
}
