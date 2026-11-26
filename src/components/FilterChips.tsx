import { useId } from 'react';

/**
 * Filtre d'une liste (#137) : des pastilles « appuyée / non appuyée », une seule à la fois.
 * Toucher la pastille choisie la retire : le filtre s'enlève d'un geste. Le groupe porte son
 * nom pour le lecteur d'écran (« Type », « Âge »…).
 */
export function FilterChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
}) {
  const id = useId();
  return (
    <div className="filter-group" role="group" aria-labelledby={id}>
      <span id={id} className="filter-group__label">
        {label}
      </span>
      <div className="chips">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              className="filter-chip"
              aria-pressed={on}
              onClick={() => onChange(on ? null : o.value)}
            >
              {on && <span aria-hidden="true">✓ </span>}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
