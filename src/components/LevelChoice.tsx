import { LEVELS, type Level } from '../games/levels';

/**
 * Choix d'un niveau par âge (#40) : Petits, Moyens, Grands, et « Tous » si `allLabel` est donné
 * (aucun niveau : toutes les cartes). Boutons radio, comme les réglages de l'espace Parent.
 */
export function LevelChoice({
  legend,
  hideLegend,
  name,
  value,
  allLabel,
  onChange,
}: {
  legend: string;
  hideLegend?: boolean;
  name: string;
  value: Level | null | undefined;
  allLabel?: string;
  onChange: (level: Level | null) => void;
}) {
  const options: { value: Level | null; label: string }[] = [
    ...(allLabel ? [{ value: null, label: allLabel }] : []),
    ...LEVELS.map((l) => ({ value: l.value, label: l.name })),
  ];
  const chosen = LEVELS.find((l) => l.value === value);
  return (
    <fieldset className="setting level-choice">
      <legend className={hideLegend ? 'sr-only' : 'eyebrow'}>{legend}</legend>
      <div className={`segmented segmented--${options.length}`}>
        {options.map((o) => (
          <label key={o.value ?? 'tous'}>
            <input
              type="radio"
              name={name}
              value={o.value ?? ''}
              checked={(value ?? null) === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {chosen && <p className="muted level-choice__ages">{chosen.ages}</p>}
    </fieldset>
  );
}
