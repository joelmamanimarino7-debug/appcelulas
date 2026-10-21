"use client";

interface NominaListProps {
  label: string;
  hint?: string;
  values: string[];
  max: number;
  onChange: (values: string[]) => void;
}

export function NominaList({ label, hint, values, max, onChange }: NominaListProps) {
  const slots = Array.from({ length: max }, (_, i) => values[i] ?? "");
  const llenos = slots.filter((v) => v.trim() !== "").length;

  function handleChange(index: number, value: string) {
    const next = [...slots];
    next[index] = value;
    onChange(next);
  }

  return (
    <fieldset>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <legend className="text-sm font-semibold text-slate-800">
          {label}
          {hint && <span className="ml-1.5 font-normal text-slate-500">· {hint}</span>}
        </legend>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            llenos > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {llenos} de {max}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {slots.map((value, i) => (
          <div
            key={i}
            className="flex items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100"
          >
            <span className="w-8 shrink-0 text-center text-xs font-medium text-slate-400">
              {i + 1}
            </span>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="words"
              value={value}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder="Nombre completo"
              aria-label={`${label} ${i + 1}`}
              className="w-full rounded-r-xl bg-transparent py-2.5 pr-3 text-base text-slate-900 placeholder:text-slate-400 outline-none sm:text-sm"
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
