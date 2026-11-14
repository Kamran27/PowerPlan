import { SPACE_KINDS, type SpaceKind } from "../lib/spaceKinds";

/** Auswahl der Bereich-Art als kleine Karten */
export default function KindPicker({
  value,
  onChange,
}: {
  value: SpaceKind;
  onChange: (k: SpaceKind) => void;
}) {
  const selected = SPACE_KINDS.find((k) => k.id === value);
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Art des Bereichs"
        className="grid grid-cols-3 gap-1.5"
      >
        {SPACE_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={value === k.id}
            onClick={() => onChange(k.id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center transition sm:flex-row sm:items-start sm:gap-2 sm:px-2.5 sm:text-left ${
              value === k.id
                ? "bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/15"
                : "bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800/60 dark:ring-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {k.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold sm:text-sm">
                {k.label}
              </span>
              <span className="hidden text-[11px] leading-tight text-slate-500 sm:block dark:text-slate-400">
                {k.desc}
              </span>
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-1.5 text-xs text-slate-500 sm:hidden dark:text-slate-400">
          {selected.emoji} {selected.desc}
        </p>
      )}
    </div>
  );
}
