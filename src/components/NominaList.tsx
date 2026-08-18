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

  function handleChange(index: number, value: string) {
    const next = [...slots];
    next[index] = value;
    onChange(next);
  }

  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{label}</legend>
      {hint && <p className="mb-3 text-xs text-slate-500">{hint}</p>}
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {slots.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-sm text-slate-400">
              {i + 1}.
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder="Nombre completo"
              className="w-full border-b border-slate-300 bg-transparent px-1 py-1 text-sm outline-none focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
