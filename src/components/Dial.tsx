interface DialProps {
  label: string;
  value: number;
  unitLabel: string;
  onChange: (value: number) => void;
}

const stepBtn =
  "w-12 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/35 text-2xl font-bold leading-none flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

export default function Dial({ label, value, unitLabel, onChange }: DialProps) {
  return (
    <div className="flex-1 bg-white/10 rounded-2xl p-3">
      <div className="text-xs font-bold tracking-widest uppercase opacity-80 mb-2 text-center">
        {label}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          className={stepBtn}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label} time`}
        >
          −
        </button>
        <div className="min-w-[5.5rem] text-center">
          <span
            className="text-3xl font-black"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          <span className="text-sm font-semibold opacity-70 ml-1">{unitLabel}</span>
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
